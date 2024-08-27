import {
  parseEther,
  parseUnits,
  createWalletClient,
  createPublicClient,
  http,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import hre from "hardhat";
import { trim0x } from "@1inch/solidity-utils";
import {
  buildOrder,
  buildMakerTraits,
  buildTakerTraits,
} from "../helpers/LimitOrderUtils";
import {
  signLimitOrder,
  signOpenPositionRequest,
} from "../helpers/LocalSigningUtils";
import { OpenPositionRequest } from "../../test/utils/PerpStructUtils";
import {
  getERC20ApproveFunctionCallData,
  getFillOrderFunctionCallData,
} from "../../test/utils/SwapUtils";

import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

async function main() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });
  const maker = createWalletClient({
    account: privateKeyToAccount(`0x${process.env.SEPOLIA_PRIVATE_KEY}`),
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });
  console.log(`Maker address: ${maker.account.address}`);
  const user = createWalletClient({
    account: privateKeyToAccount(`0x${process.env.SEPOLIA_PRIVATE_KEY_2}`),
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });
  console.log(`User address: ${user.account.address}`);

  const takerAsset: `0x${string}` = `0x${trim0x(
    process.env.TAKER_ASSET ?? "0x92ea09E6F1Cc933baAC19CD6414b64a9d84cc135"
  )}`;
  const takerAssetDecimals = await (
    await hre.viem.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      takerAsset,
      { client: { wallet: user, public: publicClient } }
    )
  ).read.decimals();
  const takingAmount = parseUnits(
    process.env.TAKING_AMOUNT ?? "5000",
    takerAssetDecimals
  );
  const makingAmount = parseEther(process.env.MAKING_AMOUNT ?? "2");
  const salt = process.env.SALT ?? "42";

  const orderbookAddress = "0xF4EF3861E94ffD680f298ABE275b2Ef8EcA1517a";
  const shortPoolAddress = "0x29D47Eb1bc6965F193eC0FaD6d419f7a6Bb49A5C";
  const shortPool = await hre.viem.getContractAt(
    "WasabiShortPool",
    shortPoolAddress,
    { client: { wallet: user, public: publicClient } }
  );
  const existingAddressProviderAddress = await shortPool.read.addressProvider();
  const existingAddressProvider = await hre.viem.getContractAt(
    "AddressProvider",
    existingAddressProviderAddress,
    { client: { wallet: user, public: publicClient } }
  );
  const weth = await existingAddressProvider.read.getWethAddress();

  const order = buildOrder({
    salt,
    maker: maker.account.address,
    makerAsset: weth,
    takerAsset,
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

  const downPayment = makingAmount / 5n;  // 0.4 ETH
  const fee = parseEther("0.01");

  const openPositionRequest: OpenPositionRequest = {
    id: 133769n,
    currency: takerAsset,
    targetCurrency: weth,
    downPayment,
    principal: takingAmount,
    minTargetAmount: makingAmount,
    expiration: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7),
    fee,
    functionCallDataList: [
      getERC20ApproveFunctionCallData(takerAsset, orderbookAddress, takingAmount),
      // execute swap in two partial fills
      getFillOrderFunctionCallData(
        orderbookAddress,
        order,
        r,
        vs,
        takingAmount / 2n,
        buildTakerTraits().traits
      ),
      getFillOrderFunctionCallData(
        orderbookAddress,
        order,
        r,
        vs,
        takingAmount / 2n,
        buildTakerTraits().traits
      ),
    ],
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
    ${openPositionRequest.functionCallDataList.map(
      (f) => `{
      to: ${f.to},
      value: ${f.value},
      data: ${f.data}
    }`
    )}
  }`);

  const signature = await signOpenPositionRequest(
    maker,
    "WasabiShortPool",
    shortPool.address,
    openPositionRequest
  );
  await shortPool.write.openPosition([openPositionRequest, signature], {
    account: user.account,
    value: downPayment + fee,
  });
  const positionHash = await shortPool.read.positions([openPositionRequest.id]);
  console.log(`Position hash: ${positionHash}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
