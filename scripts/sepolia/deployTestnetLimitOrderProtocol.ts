import { formatEther, parseEther, getAddress } from "viem";
import hre from "hardhat";
import { verifyContract } from "../../utils/verifyContract";

async function main() {
  const deployer = "0x129320410d1F827597Befcb01Dc7a037c7fbA6d5";
  const longPoolAddress = "0x978cbedb003fdb36cbff7986cfc444cdfd38c133";
  const longPool = await hre.viem.getContractAt("WasabiLongPool", longPoolAddress);
  const existingAddressProviderAddress = await longPool.read.addressProvider();
  const existingAddressProvider = await hre.viem.getContractAt("AddressProvider", existingAddressProviderAddress);
  const weth = await existingAddressProvider.read.getWethAddress();

  console.log("1. Deploying 1inch LimitOrderProtocol...");
  const contractName = "LimitOrderProtocol";
  const limitOrderContract = 
    await hre.viem.deployContract("LimitOrderProtocol", [weth]);
  console.log(`${contractName} deployed to ${limitOrderContract.address}`);

  console.log("2. Verifying deployed LimitOrderProtocol...");
  await verifyContract(limitOrderContract.address, [weth]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
