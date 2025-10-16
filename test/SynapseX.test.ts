import { describe, it } from "node:test";
import { expect } from "chai";
import hre from "hardhat";
import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import { deploySynapseXFixture } from "./fixtures/SynapseXFixture";

// Create a named fixture function
const synapseXFixture = deploySynapseXFixture;

describe("SynapseX Contracts", function () {
  describe("DataCoin", function () {
    it("Should mint a dataset token", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { dataCoin, owner } = await networkHelpers.loadFixture(synapseXFixture);
      
      const cid = "QmTest123";
      const name = "Test Dataset";
      const description = "A test dataset for demonstration";
      const price = 1000000; // 1 USDC (6 decimals)
      const accessPolicy = '{"type": "public", "expiry": 86400}';
      const totalSupply = 0; // Single dataset
      
      const hash = await dataCoin.write.mintDataset([
        owner.address,
        cid,
        name,
        description,
        price,
        accessPolicy,
        totalSupply
      ]);
      
      // For now, just check that the transaction was successful
      expect(hash).to.be.a('string');
      expect(hash).to.have.lengthOf(66); // 0x + 64 hex chars
      
      const tokenId = await dataCoin.read.totalSupply();
      expect(tokenId).to.equal(1n);
      
      const datasetInfo = await dataCoin.read.getDatasetInfo([1]);
      expect(datasetInfo.cid).to.equal(cid);
      expect(datasetInfo.name).to.equal(name);
      expect(datasetInfo.price).to.equal(BigInt(price));
      expect(datasetInfo.creator.toLowerCase()).to.equal(owner.address.toLowerCase());
      expect(datasetInfo.isActive).to.be.true;
    });
    
    it("Should prevent duplicate CID minting", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { dataCoin, owner } = await networkHelpers.loadFixture(synapseXFixture);
      
      const cid = "QmTest123";
      
      // First mint should succeed
      await dataCoin.write.mintDataset([
        owner.address,
        cid,
        "Test Dataset 1",
        "Description 1",
        1000000,
        '{"type": "public"}',
        0
      ]);
      
      // Second mint with same CID should fail
      try {
        await dataCoin.write.mintDataset([
          owner.address,
          cid,
          "Test Dataset 2",
          "Description 2",
          2000000,
          '{"type": "private"}',
          0
        ]);
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("Dataset with this CID already exists");
      }
    });
    
    it("Should allow creator to update dataset", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { dataCoin, owner } = await networkHelpers.loadFixture(synapseXFixture);
      
      // Mint a dataset
      await dataCoin.write.mintDataset([
        owner.address,
        "QmTest123",
        "Test Dataset",
        "Description",
        1000000,
        '{"type": "public"}',
        0
      ]);
      
      const newPrice = 2000000;
      const newAccessPolicy = '{"type": "private", "expiry": 3600}';
      
      const hash = await dataCoin.write.updateDataset([1, newPrice, newAccessPolicy]);
      expect(hash).to.be.a('string');
      
      const datasetInfo = await dataCoin.read.getDatasetInfo([1]);
      expect(datasetInfo.price).to.equal(BigInt(newPrice));
      expect(datasetInfo.accessPolicy).to.equal(newAccessPolicy);
    });
  });
  
  describe("DataMarketplace", function () {
    it("Should execute a purchase", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { marketplace, dataCoin, mockUSDC, owner, buyer } = await networkHelpers.loadFixture(synapseXFixture);
      
      // Mint a dataset
      await dataCoin.write.mintDataset([
        owner.address,
        "QmTest123",
        "Test Dataset",
        "Description",
        1000000, // 1 USDC
        '{"type": "public"}',
        0
      ]);
      
      // Give buyer some USDC
      await mockUSDC.write.mint([buyer.address, 10000000]); // 10 USDC
      
      // Approve marketplace to spend buyer's USDC
      await mockUSDC.write.approve([marketplace.address, 1000000], {
        account: buyer
      });
      
      // Also give owner some USDC and approve marketplace to spend it
      await mockUSDC.write.mint([owner.address, 10000000]); // 10 USDC
      await mockUSDC.write.approve([marketplace.address, 1000000], {
        account: owner
      });
      
      const accessToken = "temp_access_token_123";
      
      // The marketplace should allow the owner to execute purchase
      const hash = await marketplace.write.executePurchase([1, 1, accessToken], {
        account: owner
      });
      expect(hash).to.be.a('string');
      
      // Check that buyer's USDC was deducted
      const buyerBalance = await mockUSDC.read.balanceOf([buyer.address]);
      expect(buyerBalance).to.equal(9000000n); // 9 USDC remaining
      
      // Check that creator received payment (minus platform fee)
      const creatorBalance = await mockUSDC.read.balanceOf([owner.address]);
      expect(creatorBalance).to.be.greaterThan(1000000n); // Should have received payment
    });
    
    it("Should calculate platform fee correctly", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { marketplace } = await networkHelpers.loadFixture(synapseXFixture);
      
      const amount = 1000000; // 1 USDC
      const platformFee = await marketplace.read.calculatePlatformFee([amount]);
      const creatorRevenue = await marketplace.read.calculateCreatorRevenue([amount]);
      
      expect(platformFee).to.equal(25000n); // 2.5% of 1 USDC
      expect(creatorRevenue).to.equal(975000n); // 97.5% of 1 USDC
      expect(platformFee + creatorRevenue).to.equal(BigInt(amount));
    });
  });
  
  describe("CrossChainBridge", function () {
    it("Should create a cross-chain intent", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { bridge, dataCoin, owner } = await networkHelpers.loadFixture(synapseXFixture);
      
      // Mint a dataset
      await dataCoin.write.mintDataset([
        owner.address,
        "QmTest123",
        "Test Dataset",
        "Description",
        1000000,
        '{"type": "public"}',
        0
      ]);
      
      const intentId = await bridge.write.createIntent([
        1, // tokenId
        1, // amount
        1, // sourceChainId (Ethereum)
        137 // destinationChainId (Polygon)
      ]);
      
      expect(intentId).to.be.a('string');
      
      // Wait a bit for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const intent = await bridge.read.getIntent([intentId]);
      expect(intent.buyer.toLowerCase()).to.equal(owner.address.toLowerCase());
      expect(intent.tokenId).to.equal(1n);
      expect(intent.sourceChainId).to.equal(1n);
      expect(intent.destinationChainId).to.equal(137n);
      expect(intent.isExecuted).to.be.false;
    });
    
    it("Should execute intent after proof verification", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { bridge, dataCoin, owner } = await networkHelpers.loadFixture(synapseXFixture);
      
      // Mint a dataset
      await dataCoin.write.mintDataset([
        owner.address,
        "QmTest123",
        "Test Dataset",
        "Description",
        1000000,
        '{"type": "public"}',
        0
      ]);
      
      // Create intent
      const intentId = await bridge.write.createIntent([1, 1, 1, 137]);
      
      // Wait for the intent to be created
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify proof (simplified for testing)
      const proofHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      await bridge.write.verifyProof([proofHash, true]);
      
      const accessToken = "temp_access_token_123";
      
      // Execute intent
      const hash = await bridge.write.executeIntent([intentId, proofHash, accessToken]);
      expect(hash).to.be.a('string');
      
      // Wait for the intent to be executed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const intent = await bridge.read.getIntent([intentId]);
      expect(intent.isExecuted).to.be.true;
      expect(intent.accessToken).to.equal(accessToken);
    });
    
    it("Should reject unsupported chains", async function () {
      const { networkHelpers } = await hre.network.connect();
      const { bridge, dataCoin, owner } = await networkHelpers.loadFixture(synapseXFixture);
      
      // Mint a dataset
      await dataCoin.write.mintDataset([
        owner.address,
        "QmTest123",
        "Test Dataset",
        "Description",
        1000000,
        '{"type": "public"}',
        0
      ]);
      
      // Try to create intent with unsupported chain
      try {
        await bridge.write.createIntent([1, 1, 999, 137]); // Chain 999 not supported
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("Unsupported source chain");
      }
    });
  });
});
