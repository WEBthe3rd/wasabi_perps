import { parseEther, parseUnits, createWalletClient, createPublicClient, http } from "viem";
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import hre from "hardhat";
import { trim0x } from "@1inch/solidity-utils"
import { buildOrder, buildMakerTraits, buildTakerTraits } from "../helpers/LimitOrderUtils";
import { signLimitOrder, signOpenPositionRequest } from "../helpers/LocalSigningUtils";
import { OpenPositionRequest } from "../../test/utils/PerpStructUtils";
import { getERC20ApproveFunctionCallData, getFillOrderFunctionCallData } from "../../test/utils/SwapUtils";

import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

async function main() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  });
  const maker = createWalletClient({
    account: privateKeyToAccount(`0x${process.env.SEPOLIA_PRIVATE_KEY}`),
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  });
  console.log(`Maker address: ${maker.account.address}`);
  const user = createWalletClient({
    account: privateKeyToAccount(`0x${process.env.SEPOLIA_PRIVATE_KEY_2}`),
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL)
  });
  console.log(`User address: ${user.account.address}`);

  const makerAsset: `0x${string}` = `0x${trim0x(
    process.env.MAKER_ASSET ?? "0x92ea09E6F1Cc933baAC19CD6414b64a9d84cc135"
  )}`;
  const makerAssetDecimals = await (
    await hre.viem.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", 
      makerAsset, 
      {client: {wallet: user, public: publicClient}}
    )).read.decimals();
  const makingAmount = parseUnits(process.env.MAKING_AMOUNT ?? "5000", makerAssetDecimals);
  const takingAmount = parseEther(process.env.TAKING_AMOUNT ?? "2");
  const salt = process.env.SALT ?? "69";

  const orderbookAddress = "0xF4EF3861E94ffD680f298ABE275b2Ef8EcA1517a";
  const longPoolAddress = "0xa3975155b728d656f751203e050ec86ee011636e";
  const longPool = await hre.viem.getContractAt("WasabiLongPool", longPoolAddress, {client: {wallet: user, public: publicClient}});
  const existingAddressProviderAddress = await longPool.read.addressProvider();
  const existingAddressProvider = await hre.viem.getContractAt("AddressProvider", existingAddressProviderAddress, {client: {wallet: user, public: publicClient}});
  const weth = await existingAddressProvider.read.getWethAddress();

  const order = buildOrder({
    salt,
    maker: maker.account.address,
    makerAsset,
    takerAsset: weth,
    makingAmount,
    takingAmount,
    makerTraits: buildMakerTraits(),
  });
  console.log(`Order: {
    ${order.salt},
    ${order.maker},
    ${order.makerAsset},
    ${order.takerAsset},
    ${order.makingAmount.toString()},
    ${order.takingAmount.toString()},
    ${order.makerTraits}
  }`);

  const { r, yParityAndS: vs } = hre.ethers.Signature.from(
    await signLimitOrder(order, sepolia.id, orderbookAddress, maker)
  );

  const downPayment = takingAmount / 5n;
  const principal = takingAmount * 4n / 5n;
  const fee = parseEther("0.01");
  const openPositionRequest: OpenPositionRequest = {
    id: 133742n,
    currency: weth,
    targetCurrency: makerAsset,
    downPayment,
    principal,
    minTargetAmount: makingAmount,
    expiration: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7),
    fee,
    functionCallDataList: [
      getERC20ApproveFunctionCallData(weth, orderbookAddress, takingAmount),
      // execute swap in two partial fills
      getFillOrderFunctionCallData(orderbookAddress, order, r, vs, takingAmount / 2n, buildTakerTraits().traits),
      getFillOrderFunctionCallData(orderbookAddress, order, r, vs, takingAmount / 2n, buildTakerTraits().traits),
    ]
  };
  console.log(`Open position request: { 
    ${openPositionRequest.id.toString()},
    ${openPositionRequest.currency},
    ${openPositionRequest.targetCurrency},
    ${openPositionRequest.downPayment.toString()},
    ${openPositionRequest.principal.toString()},
    ${openPositionRequest.minTargetAmount.toString()},
    ${openPositionRequest.expiration.toString()},
    ${openPositionRequest.fee.toString()},
    ${openPositionRequest.functionCallDataList.map((f) => `{
      to: ${f.to},
      value: ${f.value},
      data: ${f.data}
    }`)}
  }`);

  const signature = await signOpenPositionRequest(maker, "WasabiLongPool", longPool.address, openPositionRequest)
  await longPool.write.openPosition(
    [
      openPositionRequest, 
      signature
    ], {account: user.account, value: downPayment + fee});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});