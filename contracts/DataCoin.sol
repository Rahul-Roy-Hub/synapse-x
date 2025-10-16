// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DataCoin
 * @dev ERC-721 token for data tokenization with access control
 * Each token represents a unique dataset with metadata stored on IPFS/Lighthouse
 */
contract DataCoin is ERC721, Ownable, ReentrancyGuard {
    uint256 private _tokenIds;
    
    // Struct to store dataset metadata
    struct DatasetInfo {
        string cid;                    // IPFS/Lighthouse CID
        string name;                   // Dataset name
        string description;            // Dataset description
        uint256 price;                 // Price in USDC (6 decimals)
        address creator;               // Original creator
        bool isActive;                 // Whether dataset is active
        uint256 createdAt;             // Creation timestamp
        string accessPolicy;           // Access control policy (JSON string)
        uint256 totalSupply;           // Total supply (for fractionalized datasets)
        uint256 soldSupply;            // Amount sold
    }
    
    // Mapping from token ID to dataset info
    mapping(uint256 => DatasetInfo) public datasets;
    
    // Mapping from CID to token ID (to prevent duplicates)
    mapping(string => uint256) public cidToTokenId;
    
    // Events
    event DatasetMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string cid,
        uint256 price,
        string accessPolicy
    );
    
    event DatasetUpdated(
        uint256 indexed tokenId,
        uint256 newPrice,
        string newAccessPolicy
    );
    
    event AccessGranted(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    constructor() ERC721("DataCoin", "DATA") Ownable(msg.sender) {}
    
    /**
     * @dev Mint a new dataset token
     * @param to Address to mint the token to
     * @param cid IPFS/Lighthouse CID of the dataset
     * @param name Dataset name
     * @param description Dataset description
     * @param price Price in USDC (6 decimals)
     * @param accessPolicy Access control policy (JSON string)
     * @param maxSupply Total supply for fractionalized datasets (0 for single dataset)
     */
    function mintDataset(
        address to,
        string memory cid,
        string memory name,
        string memory description,
        uint256 price,
        string memory accessPolicy,
        uint256 maxSupply
    ) external onlyOwner nonReentrant returns (uint256) {
        require(bytes(cid).length > 0, "CID cannot be empty");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(price > 0, "Price must be greater than 0");
        require(cidToTokenId[cid] == 0, "Dataset with this CID already exists");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        datasets[newTokenId] = DatasetInfo({
            cid: cid,
            name: name,
            description: description,
            price: price,
            creator: to,
            isActive: true,
            createdAt: block.timestamp,
            accessPolicy: accessPolicy,
            totalSupply: maxSupply,
            soldSupply: 0
        });
        
        cidToTokenId[cid] = newTokenId;
        
        _safeMint(to, newTokenId);
        
        emit DatasetMinted(newTokenId, to, cid, price, accessPolicy);
        
        return newTokenId;
    }
    
    /**
     * @dev Update dataset price and access policy (only creator)
     * @param tokenId Token ID to update
     * @param newPrice New price in USDC
     * @param newAccessPolicy New access policy
     */
    function updateDataset(
        uint256 tokenId,
        uint256 newPrice,
        string memory newAccessPolicy
    ) external {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        require(datasets[tokenId].creator == msg.sender, "Only creator can update");
        require(newPrice > 0, "Price must be greater than 0");
        
        datasets[tokenId].price = newPrice;
        datasets[tokenId].accessPolicy = newAccessPolicy;
        
        emit DatasetUpdated(tokenId, newPrice, newAccessPolicy);
    }
    
    /**
     * @dev Grant access to a dataset (called by marketplace after payment)
     * @param tokenId Token ID
     * @param buyer Address of the buyer
     * @param amount Amount purchased
     */
    function grantAccess(
        uint256 tokenId,
        address buyer,
        uint256 amount
    ) external onlyOwner {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        require(datasets[tokenId].isActive, "Dataset is not active");
        
        datasets[tokenId].soldSupply += amount;
        
        emit AccessGranted(tokenId, buyer, amount, block.timestamp);
    }
    
    /**
     * @dev Deactivate a dataset (only creator)
     * @param tokenId Token ID to deactivate
     */
    function deactivateDataset(uint256 tokenId) external {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        require(datasets[tokenId].creator == msg.sender, "Only creator can deactivate");
        
        datasets[tokenId].isActive = false;
    }
    
    /**
     * @dev Get dataset information
     * @param tokenId Token ID
     * @return DatasetInfo struct
     */
    function getDatasetInfo(uint256 tokenId) external view returns (DatasetInfo memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return datasets[tokenId];
    }
    
    /**
     * @dev Check if a CID already exists
     * @param cid IPFS/Lighthouse CID
     * @return bool True if CID exists
     */
    function cidExists(string memory cid) external view returns (bool) {
        return cidToTokenId[cid] != 0;
    }
    
    /**
     * @dev Get total number of minted tokens
     * @return uint256 Total token count
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIds;
    }
    
    /**
     * @dev Override tokenURI to return metadata
     * @param tokenId Token ID
     * @return string Token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        DatasetInfo memory dataset = datasets[tokenId];
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _encodeBase64(bytes(string(abi.encodePacked(
                '{"name":"', dataset.name, '",',
                '"description":"', dataset.description, '",',
                '"image":"ipfs://', dataset.cid, '",',
                '"attributes":[',
                '{"trait_type":"Price","value":"', _uint2str(dataset.price), '"},',
                '{"trait_type":"Creator","value":"', _address2str(dataset.creator), '"},',
                '{"trait_type":"Created At","value":"', _uint2str(dataset.createdAt), '"},',
                '{"trait_type":"Access Policy","value":"', dataset.accessPolicy, '"}',
                ']}'
            ))))
        ));
    }
    
    // Helper functions
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    function _address2str(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        string memory result = new string(4 * ((data.length + 2) / 3));
        
        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            
            for {
                let i := 0
            } lt(i, mload(data)) {
                i := add(i, 3)
            } {
                let input := and(mload(add(data, add(32, i))), 0xffffff)
                
                let out := mload(add(tablePtr, and(shr(250, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(244, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(238, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(232, input), 0x3F))), 0xFF))
                out := shl(224, out)
                
                mstore(resultPtr, out)
                
                resultPtr := add(resultPtr, 4)
            }
            
            switch mod(mload(data), 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }
        }
        
        return result;
    }
}
