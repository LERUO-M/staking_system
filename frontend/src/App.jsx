import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { 
  NFT_ADDRESS, 
  STAKING_ADDRESS, 
  REWARD_TOKEN_ADDRESS, 
  NFT_ABI, 
  STAKING_ABI, 
  REWARD_TOKEN_ABI 
} from './contract'

function App() {
  const [account, setAccount] = useState(null);
  const [contracts, setContracts] = useState({ nft: null, staking: null, reward: null });
  const [stats, setStats] = useState({ earned: "0", stakedCount: "0" });
  const [myNFTs, setMyNFTs] = useState([]); // NFTs in wallet
  const [stakedIDs, setStakedIDs] = useState([]); // IDs currently in the vault

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    setAccount(address);
    setContracts({
      nft: new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer),
      staking: new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer),
      reward: new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, signer)
    });
  };

  // Refresh data every 10 seconds
  useEffect(() => {
    if (account && contracts.staking) {
      const interval = setInterval(fetchData, 10000);
      fetchData();
      return () => clearInterval(interval);
    }
  }, [account, contracts]);

  const fetchData = async () => {
    try {
      // 1. Fetch Rewards & Staked Count
      const earned = await contracts.staking.earned(account);
      const count = await contracts.staking.stakedBalance(account);
      setStats({
        earned: ethers.formatEther(earned),
        stakedCount: count.toString()
      });

      // 2. Scan for NFTs (Checking IDs 1-20 for this example)
      let walletInventory = [];
      let vaultInventory = [];

      for (let i = 1; i <= 20; i++) {
        try {
          const owner = await contracts.nft.ownerOf(i);
          if (owner.toLowerCase() === account.toLowerCase()) {
            walletInventory.push(i);
          } else if (owner.toLowerCase() === STAKING_ADDRESS.toLowerCase()) {
            // Check if the staking contract says WE are the owner of this staked ID
            // Assuming your contract has a mapping like nftOwners(uint256)
            const staker = await contracts.staking.nftOwners(i);
            if (staker.toLowerCase() === account.toLowerCase()) {
              vaultInventory.push(i);
            }
          }
        } catch (e) {
          // Token ID doesn't exist yet, skip
        }
      }
      setMyNFTs(walletInventory);
      setStakedIDs(vaultInventory);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleStake = async (id) => {
    try {
      // Check if already approved
      const approvedAddr = await contracts.nft.getApproved(id);
      if (approvedAddr.toLowerCase() !== STAKING_ADDRESS.toLowerCase()) {
        console.log("Requesting Approval...");
        const tx1 = await contracts.nft.approve(STAKING_ADDRESS, id);
        await tx1.wait();
      }

      console.log("Staking NFT...");
      const tx2 = await contracts.staking.stake(id);
      await tx2.wait();
      alert(`Success! NFT #${id} is now staked.`);
      fetchData();
    } catch (err) {
      console.error("Staking failed:", err);
    }
  };

  const handleUnstake = async (id) => {
    try {
      const tx = await contracts.staking.withdraw(id);
      await tx.wait();
      alert(`NFT #${id} returned to wallet.`);
      fetchData();
    } catch (err) {
      alert("Error: Check if the 30-second lock period has passed!");
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1>💎 Diamond Hands Staking</h1>
        {!account ? (
          <button onClick={connectWallet} style={btnStyle}>Connect Wallet</button>
        ) : (
          <div style={addressBox}>{account.slice(0,6)}...{account.slice(-4)}</div>
        )}
      </header>

      {account && (
        <main style={{ marginTop: '30px' }}>
          {/* STATS */}
          <div style={statsGrid}>
            <div style={statCard}>
              <h3 style={{color: '#888'}}>Pending Rewards</h3>
              <p style={bigNumber}>{Number(stats.earned).toFixed(6)} RWD</p>
              <button onClick={() => contracts.staking.getReward()} style={claimBtn}>Claim Rewards</button>
            </div>
            <div style={statCard}>
              <h3 style={{color: '#888'}}>Staked NFTs</h3>
              <p style={bigNumber}>{stats.stakedCount}</p>
              <p style={{fontSize: '0.8rem'}}>Earning at {/* rewardRate here */} RWD/sec</p>
            </div>
          </div>

          {/* MINT BOX */}
          <div style={mintSection}>
             <button onClick={() => contracts.nft.mint(1, {value: ethers.parseEther("0.01")})} style={actionBtn}>
               Mint New NFT (0.01 ETH)
             </button>
          </div>

          <div style={dashboardGrid}>
            {/* WALLET INVENTORY */}
            <section>
              <h2>In Your Wallet ({myNFTs.length})</h2>
              <div style={nftGrid}>
                {myNFTs.map(id => (
                  <div key={id} style={nftCard}>
                    <div style={imgPlaceholder}>NFT #{id}</div>
                    <button onClick={() => handleStake(id)} style={stakeBtn}>Stake NFT</button>
                  </div>
                ))}
              </div>
            </section>

            {/* STAKED VAULT */}
            <section>
              <h2>Staked in Vault ({stakedIDs.length})</h2>
              <div style={nftGrid}>
                {stakedIDs.map(id => (
                  <div key={id} style={nftCard}>
                    <div style={{...imgPlaceholder, backgroundColor: '#d4edda'}}>Staked #{id}</div>
                    <button onClick={() => handleUnstake(id)} style={unstakeBtn}>Unstake</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  )
}

/** STYLES **/
const containerStyle = { fontFamily: 'Inter, sans-serif', padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh', color: '#1c1e21' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '20px' };
const btnStyle = { padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', fontWeight: 'bold' };
const addressBox = { padding: '10px 15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px', fontWeight: '500' };
const statsGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' };
const statCard = { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' };
const bigNumber = { fontSize: '2.5rem', fontWeight: '800', margin: '15px 0', color: '#1a1a1a' };
const claimBtn = { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' };
const mintSection = { textAlign: 'center', margin: '40px 0' };
const actionBtn = { padding: '15px 40px', fontSize: '1rem', borderRadius: '12px', cursor: 'pointer', border: '1px solid #007bff', backgroundColor: 'transparent', color: '#007bff', fontWeight: 'bold' };
const dashboardGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' };
const nftGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' };
const nftCard = { backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const imgPlaceholder = { height: '100px', backgroundColor: '#e9ecef', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '10px' };
const stakeBtn = { width: '100%', padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' };
const unstakeBtn = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #dc3545', color: '#dc3545', backgroundColor: 'transparent', cursor: 'pointer' };

export default App;