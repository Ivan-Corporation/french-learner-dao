import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config = {
  solidity: "0.8.17",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_URL || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
};
export default config;
