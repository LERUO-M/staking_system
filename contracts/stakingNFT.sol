// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract StakingContractNFT is Ownable, ReentrancyGuard, Pausable {
    using IERC20 for IERC20;
    using IERC721 for IERC721;

    IERC20 public rewardToken;
    IERC721 public NFTsBeingStaked;

    // Staking variables
    uint256 public rewardRate;
    uint256 public totalStaked;
    

    // Mapping
    mapping(uint256 => address) public nftOwners;
    mapping(address => uint256) public stakedBalance; // How much 1 user has staked
    mapping(address => uint256) public stakingTimestamp;
    mapping(address => uint256) public lastUpdateTime;
    mapping(address => uint256) public rewards;


    // Events
    event NFTStaked(address indexed user, uint256 tokenId);
    event Unstaked(address indexed user, uint256 tokenId);
    event RewardPaid(address indexed user, uint256 reward);


    constructor(address _NFTbeingStaked, address _rewardToken, uint256 _rewardRate) {
        NFTsBeingStaked = IERC721(_NFTbeingStaked);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
    }

    // Update rewards a user has before updating block.timestamp
    modifier updateReward(address _account) {
        rewards[_account] = earned(_account);
        lastUpdateTime[_account] = block.timestamp;
        _;
    }

    function earned(address _account) public view returns (uint256) {
        uint256 timePassed = block.timestamp - lastUpdateTime[_account];
        return rewards[_account] + (timePassed * rewardRate * stakedBalance[_account]);
    }

    function stake(uint256 _tokenId) external nonReentrant whenNotPaused updateReward(msg.sender) {
        // Keep track of how many NFTs staked 
        totalStaked += 1;
        stakedBalance[msg.sender] += 1;

        // Record ownership of NFT
        nftOwners[_tokenId] = msg.sender;

        NFTsBeingStaked.transferFrom(msg.sender, address(this), _tokenId);

        

        // 3. Record the start time for reward math
        stakingTimestamp[msg.sender] = block.timestamp;
        
        emit NFTStaked(msg.sender, _tokenId);
    }
}