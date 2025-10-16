// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DataMarketplace.sol";

/**
 * @title CrossChainBridge
 * @dev Handles cross-chain payments and intent execution for data marketplace
 * Integrates with Avail Nexus SDK for cross-chain operations
 */
contract CrossChainBridge is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    // USDC token address
    IERC20 public immutable usdcToken;
    
    // DataMarketplace contract reference
    DataMarketplace public immutable marketplace;
    
    // Supported chains mapping
    mapping(uint256 => bool) public supportedChains;
    
    // Cross-chain intent tracking
    struct CrossChainIntent {
        bytes32 intentId;
        address buyer;
        uint256 tokenId;
        uint256 amount;
        uint256 sourceChainId;
        uint256 destinationChainId;
        uint256 usdcAmount;
        bool isExecuted;
        bool isSettled;
        uint256 createdAt;
        uint256 executedAt;
        string accessToken;
    }
    
    // Mapping from intent ID to intent details
    mapping(bytes32 => CrossChainIntent) public intents;
    
    // Mapping from buyer to their intent IDs
    mapping(address => bytes32[]) public buyerIntents;
    
    // Avail Nexus proof verification (simplified for demo)
    mapping(bytes32 => bool) public verifiedProofs;
    
    // Events
    event IntentCreated(
        bytes32 indexed intentId,
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 sourceChainId,
        uint256 destinationChainId,
        uint256 usdcAmount
    );
    
    event IntentExecuted(
        bytes32 indexed intentId,
        address indexed buyer,
        uint256 indexed tokenId,
        string accessToken
    );
    
    event IntentSettled(
        bytes32 indexed intentId,
        address indexed buyer,
        uint256 usdcAmount
    );
    
    event ChainSupportUpdated(uint256 chainId, bool supported);
    
    event ProofVerified(bytes32 indexed proofHash, bool verified);
    
    // Errors
    error UnsupportedChain();
    error IntentNotFound();
    error IntentAlreadyExecuted();
    error IntentNotExecuted();
    error InvalidProof();
    error InsufficientBalance();
    error InvalidAmount();
    
    constructor(
        address _usdcToken,
        address _marketplace
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_marketplace != address(0), "Invalid marketplace address");
        
        usdcToken = IERC20(_usdcToken);
        marketplace = DataMarketplace(_marketplace);
        
        // Initialize supported chains (example chains)
        supportedChains[1] = true;      // Ethereum Mainnet
        supportedChains[137] = true;    // Polygon
        supportedChains[42161] = true;  // Arbitrum
        supportedChains[10] = true;     // Optimism
        supportedChains[8453] = true;   // Base
    }
    
    /**
     * @dev Create a cross-chain intent for purchasing a dataset
     * @param tokenId Token ID to purchase
     * @param amount Amount to purchase
     * @param sourceChainId Source chain ID
     * @param destinationChainId Destination chain ID
     * @return intentId Generated intent ID
     */
    function createIntent(
        uint256 tokenId,
        uint256 amount,
        uint256 sourceChainId,
        uint256 destinationChainId
    ) external nonReentrant whenNotPaused returns (bytes32) {
        require(supportedChains[sourceChainId], "Unsupported source chain");
        require(supportedChains[destinationChainId], "Unsupported destination chain");
        require(amount > 0, "Invalid amount");
        
        // Get dataset info to calculate cost
        DataCoin dataCoin = marketplace.dataCoin();
        DataCoin.DatasetInfo memory dataset = dataCoin.getDatasetInfo(tokenId);
        require(dataset.isActive, "Dataset not active");
        
        uint256 usdcAmount = dataset.price * amount;
        require(usdcAmount > 0, "Invalid USDC amount");
        
        // Generate intent ID
        bytes32 intentId = keccak256(
            abi.encodePacked(
                msg.sender,
                tokenId,
                amount,
                sourceChainId,
                destinationChainId,
                block.timestamp,
                block.number
            )
        );
        
        // Store intent
        intents[intentId] = CrossChainIntent({
            intentId: intentId,
            buyer: msg.sender,
            tokenId: tokenId,
            amount: amount,
            sourceChainId: sourceChainId,
            destinationChainId: destinationChainId,
            usdcAmount: usdcAmount,
            isExecuted: false,
            isSettled: false,
            createdAt: block.timestamp,
            executedAt: 0,
            accessToken: ""
        });
        
        // Add to buyer's intent list
        buyerIntents[msg.sender].push(intentId);
        
        emit IntentCreated(
            intentId,
            msg.sender,
            tokenId,
            sourceChainId,
            destinationChainId,
            usdcAmount
        );
        
        return intentId;
    }
    
    /**
     * @dev Execute cross-chain intent after Avail Nexus verification
     * @param intentId Intent ID to execute
     * @param proofHash Hash of the Avail Nexus proof
     * @param accessToken Access token from Lighthouse
     */
    function executeIntent(
        bytes32 intentId,
        bytes32 proofHash,
        string memory accessToken
    ) external onlyOwner nonReentrant {
        CrossChainIntent storage intent = intents[intentId];
        if (intent.buyer == address(0)) revert IntentNotFound();
        if (intent.isExecuted) revert IntentAlreadyExecuted();
        
        // Verify Avail Nexus proof (simplified for demo)
        require(verifiedProofs[proofHash], "Invalid proof");
        
        // Mark intent as executed
        intent.isExecuted = true;
        intent.executedAt = block.timestamp;
        intent.accessToken = accessToken;
        
        // Execute purchase on marketplace
        marketplace.executePurchase(intent.tokenId, intent.amount, accessToken);
        
        emit IntentExecuted(intentId, intent.buyer, intent.tokenId, accessToken);
    }
    
    /**
     * @dev Settle cross-chain payment (called after successful execution)
     * @param intentId Intent ID to settle
     * @param proofHash Hash of the settlement proof
     */
    function settleIntent(
        bytes32 intentId,
        bytes32 proofHash
    ) external onlyOwner nonReentrant {
        CrossChainIntent storage intent = intents[intentId];
        if (intent.buyer == address(0)) revert IntentNotFound();
        if (!intent.isExecuted) revert IntentNotExecuted();
        if (intent.isSettled) revert IntentAlreadyExecuted();
        
        // Verify settlement proof (simplified for demo)
        require(verifiedProofs[proofHash], "Invalid settlement proof");
        
        // Mark intent as settled
        intent.isSettled = true;
        
        emit IntentSettled(intentId, intent.buyer, intent.usdcAmount);
    }
    
    /**
     * @dev Verify Avail Nexus proof (simplified for demo)
     * In production, this would verify actual Avail Nexus proofs
     * @param proofHash Hash of the proof to verify
     * @param isValid Whether the proof is valid
     */
    function verifyProof(bytes32 proofHash, bool isValid) external onlyOwner {
        verifiedProofs[proofHash] = isValid;
        emit ProofVerified(proofHash, isValid);
    }
    
    /**
     * @dev Get intent details
     * @param intentId Intent ID
     * @return CrossChainIntent struct
     */
    function getIntent(bytes32 intentId) external view returns (CrossChainIntent memory) {
        return intents[intentId];
    }
    
    /**
     * @dev Get buyer's intent history
     * @param buyer Buyer address
     * @return bytes32[] Array of intent IDs
     */
    function getBuyerIntents(address buyer) external view returns (bytes32[] memory) {
        return buyerIntents[buyer];
    }
    
    /**
     * @dev Update chain support
     * @param chainId Chain ID
     * @param supported Whether chain is supported
     */
    function updateChainSupport(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupportUpdated(chainId, supported);
    }
    
    /**
     * @dev Pause the bridge (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the bridge (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency function to recover stuck tokens (only owner)
     * @param token Token address to recover
     * @param to Address to send tokens to
     * @param amount Amount to recover
     */
    function emergencyRecover(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid address");
        IERC20(token).safeTransfer(to, amount);
    }
    
    /**
     * @dev Check if a chain is supported
     * @param chainId Chain ID to check
     * @return bool True if chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }
    
    /**
     * @dev Get intent status
     * @param intentId Intent ID
     * @return isExecuted Whether intent is executed
     * @return isSettled Whether intent is settled
     */
    function getIntentStatus(bytes32 intentId) external view returns (bool isExecuted, bool isSettled) {
        CrossChainIntent memory intent = intents[intentId];
        return (intent.isExecuted, intent.isSettled);
    }
}
