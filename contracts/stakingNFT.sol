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
    using SafeERC20 for IERC20;

    IERC20 public rewardToken;
    IERC721 public NFTsBeingStaked;

    // Staking variables
    uint256 public rewardRate;
    uint256 public totalStaked;
    uint256 public stakingDuration = 30 seconds;
    

    // Mapping
    mapping(uint256 => address) public nftOwners;
    mapping(address => uint256) public stakedBalance; // How much 1 user has staked
    mapping(uint256 => uint256) public nftStakingTimestamp;
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

        

        // Record the start time for reward math
        nftStakingTimestamp[_tokenId] = block.timestamp;
        
        emit NFTStaked(msg.sender, _tokenId);
    }

    function _withdraw(uint256 _tokenId) internal {
        require(nftOwners[_tokenId] == msg.sender, "Not the owner");
        require(block.timestamp >= nftStakingTimestamp[_tokenId] + stakingDuration, "Still locked");
        

        totalStaked -= 1;
        stakedBalance[msg.sender] -= 1;

        // Delete the owner 
        delete nftOwners[_tokenId];
        delete nftStakingTimestamp[_tokenId];

        // Send the NFT from this contract back to the user
        NFTsBeingStaked.transferFrom(address(this), msg.sender, _tokenId);
        emit Unstaked(msg.sender, _tokenId);
    }   

    function withdraw(uint256 _tokenId) external nonReentrant updateReward(msg.sender) {
        _withdraw(_tokenId);
    } 

    // Get reward
    function _getReward() internal {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    } 

    function getReward() external nonReentrant updateReward(msg.sender) {
        _getReward();
    } 

    // Emergency in case reward system is not working on contract runs out of RWD
    function emergencyWithdraw(uint256 _tokenId) external nonReentrant {
        require(nftOwners[_tokenId] == msg.sender, "Not the owner");
        
        totalStaked -= 1;
        stakedBalance[msg.sender] -= 1;
        delete nftOwners[_tokenId];
        delete nftStakingTimestamp[_tokenId];

        NFTsBeingStaked.transferFrom(address(this), msg.sender, _tokenId);

        emit Unstaked(msg.sender, _tokenId);
    }

    function withdrawAndClaim(uint256 _tokenId) external nonReentrant updateReward(msg.sender) {
        _withdraw(_tokenId);
        _getReward();
    }

    // Fund contract with rewards
    function fundRewards(uint256 amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    // Admin functions
    function setRewardRate(uint256 _rewardRate) external onlyOwner updateReward(address(0)) {
        rewardRate = _rewardRate;
    }

    function setStakingDuration(uint256 _duration) external onlyOwner {
        stakingDuration = _duration;
    }

    // Pause/Unpause staking
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}