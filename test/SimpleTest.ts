import { describe, it } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

describe("SynapseX Simple Tests", function () {
  it("Should deploy MockUSDC", async function () {
    const { viem } = await hre.network.connect();
    const [deployer] = await viem.getWalletClients();
    
    const mockUSDC = await viem.deployContract("MockUSDC", [
      "Mock USDC",
      "USDC",
      6,
      deployer.account.address
    ]);
    
    expect(mockUSDC.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    
    const name = await mockUSDC.read.name();
    expect(name).to.equal("Mock USDC");
  });

  it("Should deploy DataCoin", async function () {
    const { viem } = await hre.network.connect();
    
    const dataCoin = await viem.deployContract("DataCoin", []);
    
    expect(dataCoin.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    
    const name = await dataCoin.read.name();
    expect(name).to.equal("DataCoin");
  });

  it("Should mint a dataset", async function () {
    const { viem } = await hre.network.connect();
    const [deployer] = await viem.getWalletClients();
    
    // Deploy DataCoin
    const dataCoin = await viem.deployContract("DataCoin", []);
    
    // Mint a dataset
    const cid = "QmTest123";
    const name = "Test Dataset";
    const description = "A test dataset";
    const price = 1000000; // 1 USDC
    const accessPolicy = '{"type": "public"}';
    const maxSupply = 0;
    
    const hash = await dataCoin.write.mintDataset([
      deployer.account.address,
      cid,
      name,
      description,
      price,
      accessPolicy,
      maxSupply
    ]);
    
    expect(hash).to.be.a('string');
    
    const tokenId = await dataCoin.read.totalSupply();
    expect(tokenId).to.equal(1n);
    
    const datasetInfo = await dataCoin.read.getDatasetInfo([tokenId]);
    expect(datasetInfo.name).to.equal(name);
    expect(datasetInfo.price).to.equal(BigInt(price));
    expect(datasetInfo.creator.toLowerCase()).to.equal(deployer.account.address.toLowerCase());
  });
});
