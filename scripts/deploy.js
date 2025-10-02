import hre from "hardhat";

async function main() {
  const Factory = await hre.ethers.getContractFactory("FrenchLearner");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  console.log(`✅ Deployed at: ${await contract.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
