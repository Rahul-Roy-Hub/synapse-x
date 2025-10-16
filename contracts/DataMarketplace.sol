// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./DataCoin.sol";

/**
 * @title DataMarketplace
 * @dev Marketplace contract for trading data tokens with cross-chain payment support
 */
contract DataMarketplace is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    // USDC token address (6 decimals)
    IERC20 public immutable usdcToken;
    
    // DataCoin contract reference
    DataCoin public immutable dataCoin;
    
    // Platform fee percentage (basis points, e.g., 250 = 2.5%)
    uint256 public platformFeeBps = 250;
    
    // Maximum platform fee (basis points)
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000; // 10%
    
    // Struct for purchase records
    struct PurchaseRecord {
        uint256 tokenId;
        address buyer;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        bool isActive;
        string accessToken; // Temporary access token for Lighthouse
    }
    
    // Mapping from purchase ID to purchase record
    mapping(bytes32 => PurchaseRecord) public purchases;
    
    // Mapping from buyer to their purchase IDs
    mapping(address => bytes32[]) public buyerPurchases;
    
    // Mapping from token ID to total sales
    mapping(uint256 => uint256) public tokenSales;
    
    // Events
    event PurchaseExecuted(
        bytes32 indexed purchaseId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 price,
        uint256 platformFee,
        uint256 creatorRevenue
    );
    
    event AccessTokenGenerated(
        bytes32 indexed purchaseId,
        string accessToken,
        uint256 expiryTime
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    event Withdrawal(address indexed to, uint256 amount);
    
    // Errors
    error InsufficientPayment();
    error InvalidTokenId();
    error DatasetNotActive();
    error PurchaseNotFound();
    error AccessTokenExpired();
    error InvalidAccessToken();
    
    constructor(
        address _usdcToken,
        address _dataCoin
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_dataCoin != address(0), "Invalid DataCoin address");
        
        usdcToken = IERC20(_usdcToken);
        dataCoin = DataCoin(_dataCoin);
    }
    
    /**
     * @dev Execute a purchase of a dataset
     * @param tokenId Token ID to purchase
     * @param amount Amount to purchase (for fractionalized datasets)
     * @param accessToken Temporary access token from Lighthouse
     */
    function executePurchase(
        uint256 tokenId,
        uint256 amount,
        string memory accessToken
    ) external nonReentrant whenNotPaused {
        // Validate token exists and is active
        DataCoin.DatasetInfo memory dataset = dataCoin.getDatasetInfo(tokenId);
        if (!dataset.isActive) revert DatasetNotActive();
        
        // Calculate total cost
        uint256 totalCost = dataset.price * amount;
        if (totalCost == 0) revert InsufficientPayment();
        
        // Check buyer has sufficient USDC
        if (usdcToken.balanceOf(msg.sender) < totalCost) {
            revert InsufficientPayment();
        }
        
        // Calculate fees
        uint256 platformFee = (totalCost * platformFeeBps) / 10000;
        uint256 creatorRevenue = totalCost - platformFee;
        
        // Transfer USDC from buyer to this contract
        usdcToken.safeTransferFrom(msg.sender, address(this), totalCost);
        
        // Transfer creator revenue to dataset creator
        usdcToken.safeTransfer(dataset.creator, creatorRevenue);
        
        // Generate purchase ID
        bytes32 purchaseId = keccak256(
            abi.encodePacked(
                tokenId,
                msg.sender,
                amount,
                block.timestamp,
                block.number
            )
        );
        
        // Record purchase
        purchases[purchaseId] = PurchaseRecord({
            tokenId: tokenId,
            buyer: msg.sender,
            amount: amount,
            price: dataset.price,
            timestamp: block.timestamp,
            isActive: true,
            accessToken: accessToken
        });
        
        // Update buyer's purchase list
        buyerPurchases[msg.sender].push(purchaseId);
        
        // Update token sales
        tokenSales[tokenId] += amount;
        
        // Grant access in DataCoin contract
        dataCoin.grantAccess(tokenId, msg.sender, amount);
        
        emit PurchaseExecuted(
            purchaseId,
            tokenId,
            msg.sender,
            amount,
            dataset.price,
            platformFee,
            creatorRevenue
        );
        
        emit AccessTokenGenerated(purchaseId, accessToken, block.timestamp + 86400); // 24 hours
    }
    
    /**
     * @dev Verify access token for a purchase
     * @param purchaseId Purchase ID
     * @param accessToken Access token to verify
     * @return bool True if access token is valid
     */
    function verifyAccessToken(
        bytes32 purchaseId,
        string memory accessToken
    ) external view returns (bool) {
        PurchaseRecord memory purchase = purchases[purchaseId];
        if (!purchase.isActive) revert PurchaseNotFound();
        
        // Check if access token matches and is not expired (24 hours)
        if (keccak256(bytes(purchase.accessToken)) != keccak256(bytes(accessToken))) {
            return false;
        }
        
        // Check if access token is expired
        if (block.timestamp > purchase.timestamp + 86400) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Get purchase record
     * @param purchaseId Purchase ID
     * @return PurchaseRecord struct
     */
    function getPurchase(bytes32 purchaseId) external view returns (PurchaseRecord memory) {
        return purchases[purchaseId];
    }
    
    /**
     * @dev Get buyer's purchase history
     * @param buyer Buyer address
     * @return bytes32[] Array of purchase IDs
     */
    function getBuyerPurchases(address buyer) external view returns (bytes32[] memory) {
        return buyerPurchases[buyer];
    }
    
    /**
     * @dev Get token sales statistics
     * @param tokenId Token ID
     * @return uint256 Total amount sold
     */
    function getTokenSales(uint256 tokenId) external view returns (uint256) {
        return tokenSales[tokenId];
    }
    
    /**
     * @dev Update platform fee (only owner)
     * @param newFeeBps New fee in basis points
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_PLATFORM_FEE_BPS, "Fee too high");
        
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }
    
    /**
     * @dev Withdraw platform fees (only owner)
     * @param to Address to withdraw to
     * @param amount Amount to withdraw
     */
    function withdrawFees(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount <= usdcToken.balanceOf(address(this)), "Insufficient balance");
        
        usdcToken.safeTransfer(to, amount);
        
        emit Withdrawal(to, amount);
    }
    
    /**
     * @dev Pause the marketplace (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the marketplace (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get platform fee for a given amount
     * @param amount Amount to calculate fee for
     * @return uint256 Platform fee amount
     */
    function calculatePlatformFee(uint256 amount) external view returns (uint256) {
        return (amount * platformFeeBps) / 10000;
    }
    
    /**
     * @dev Get creator revenue for a given amount
     * @param amount Amount to calculate revenue for
     * @return uint256 Creator revenue amount
     */
    function calculateCreatorRevenue(uint256 amount) external view returns (uint256) {
        return amount - ((amount * platformFeeBps) / 10000);
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
}
