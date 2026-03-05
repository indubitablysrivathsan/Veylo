// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ReputationNFT
 * @notice Soulbound (non-transferable) NFT badges awarded for milestones.
 *         e.g., "10 Successful Jobs", "100% Pass Rate (5+ jobs)", "Top Freelancer"
 * @dev Minimal ERC-721-like implementation. Non-transferable by design.
 */
contract ReputationNFT {
    struct Badge {
        string  name;
        string  description;
        string  metadataURI;   // IPFS URI for badge artwork
        uint256 mintedAt;
    }

    uint256 public nextTokenId;
    address public owner;

    mapping(uint256 => Badge)   public badges;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256[]) public tokensOf;

    // Track which badge types have been awarded to prevent duplicates
    mapping(address => mapping(string => bool)) public hasBadge;

    event BadgeMinted(address indexed to, uint256 tokenId, string badgeName);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Mint a soulbound badge to a freelancer.
     * @param _to         Recipient address
     * @param _name       Badge name (e.g., "First Success")
     * @param _desc       Badge description
     * @param _uri        IPFS metadata URI
     */
    function mintBadge(
        address _to,
        string calldata _name,
        string calldata _desc,
        string calldata _uri
    ) external returns (uint256 tokenId) {
        require(msg.sender == owner, "Only owner");
        require(!hasBadge[_to][_name], "Badge already awarded");

        tokenId = nextTokenId++;
        badges[tokenId] = Badge({
            name:        _name,
            description: _desc,
            metadataURI: _uri,
            mintedAt:    block.timestamp
        });
        ownerOf[tokenId] = _to;
        tokensOf[_to].push(tokenId);
        hasBadge[_to][_name] = true;

        emit BadgeMinted(_to, tokenId, _name);
    }

    /**
     * @notice Get all token IDs owned by an address.
     */
    function getBadges(address _user) external view returns (uint256[] memory) {
        return tokensOf[_user];
    }

    // Soulbound: transfers are disabled
    function transfer(address, uint256) external pure {
        revert("Soulbound: non-transferable");
    }
}
