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
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>💎 Diamond Mine Protocol</h1>
        {!account ? (
          <button onClick={connectWallet} style={styles.connectBtn}>Connect Mining Rig</button>
        ) : (
          <div style={styles.addressBox}>
            <span style={styles.indicator}>●</span> {account.slice(0,6)}...{account.slice(-4)}
          </div>
        )}
      </header>

      {account && (
        <main style={styles.main}>
          {/* STATS */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <h3 style={styles.statLabel}>⛏️ Mining Output</h3>
              <div style={styles.meterContainer}>
                 <p style={styles.statValue}>{Number(stats.earned).toFixed(6)} <span style={styles.unit}>RWD</span></p>
              </div>
              <button onClick={() => contracts.staking.getReward()} style={styles.claimBtn}>
                Collect Polished Diamonds 💎
              </button>
            </div>
            <div style={styles.statCard}>
              <h3 style={styles.statLabel}>🏭 Active Refineries</h3>
              <p style={styles.statValue}>{stats.stakedCount}</p>
              <p style={styles.statSub}>Refining Efficiency: 100%</p>
            </div>
          </div>

          {/* MINT BOX */}
          <div style={styles.mintSection}>
             <button onClick={() => contracts.nft.mint(1, {value: ethers.parseEther("0.01")})} style={styles.mintBtn}>
               ⛏️ Excavate New Ore (0.01 ETH)
             </button>
          </div>

          <div style={styles.dashboardGrid}>
            {/* WALLET INVENTORY */}
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>📦 Discovered Ores ({myNFTs.length})</h2>
              <div style={styles.gridList}>
                {myNFTs.map(id => (
                  <div key={id} style={styles.oreCard}>
                    <div style={styles.oreVisual}>Ore #{id}</div>
                    <button onClick={() => handleStake(id)} style={styles.stakeBtn}>Start Refining ⚙️</button>
                  </div>
                ))}
                {myNFTs.length === 0 && <p style={styles.emptyText}>No ores found in inventory.</p>}
              </div>
            </section>

            {/* STAKED VAULT */}
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>🔥 The Refinery ({stakedIDs.length})</h2>
              <div style={styles.gridList}>
                {stakedIDs.map(id => (
                  <div key={id} style={styles.refineryCard}>
                    <div style={styles.refineryVisual}>
                        <span style={styles.pulse}>●</span> Refining #{id}
                    </div>
                    <button onClick={() => handleUnstake(id)} style={styles.unstakeBtn}>Extract Gem 💎</button>
                  </div>
                ))}
                {stakedIDs.length === 0 && <p style={styles.emptyText}>Refinery is currently idle.</p>}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  )
}

/** STYLES **/
const styles = {
  container: {
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: '40px',
    backgroundColor: '#1a1a1a', // Deep Mine Slate
    minHeight: '100vh',
    color: '#e0e0e0',
    backgroundImage: 'radial-gradient(circle at 50% 0%, #2a2a2a 0%, #1a1a1a 100%)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #333',
    paddingBottom: '20px',
    marginBottom: '40px'
  },
  title: {
    fontSize: '2rem',
    background: 'linear-gradient(45deg, #00d4ff, #2ecc71)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '2px'
  },
  connectBtn: {
    padding: '12px 24px',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#00d4ff',
    border: '1px solid #00d4ff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s ease'
  },
  addressBox: {
    padding: '10px 20px',
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '4px',
    fontWeight: '500',
    color: '#00d4ff',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  indicator: {
    color: '#2ecc71',
    fontSize: '1.2rem'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    backgroundColor: '#252525',
    padding: '30px',
    borderRadius: '8px',
    border: '1px solid #333',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  statLabel: {
    color: '#888',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    letterSpacing: '1px',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '3rem',
    fontWeight: '800',
    margin: '10px 0',
    color: '#fff',
    textShadow: '0 0 10px rgba(0, 212, 255, 0.3)'
  },
  unit: {
    fontSize: '1rem',
    color: '#00d4ff'
  },
  statSub: {
    color: '#2ecc71',
    fontSize: '0.9rem',
    marginTop: '5px'
  },
  claimBtn: {
    backgroundColor: '#2ecc71', // Emerald Green
    color: '#1a1a1a',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: '10px',
    boxShadow: '0 0 15px rgba(46, 204, 113, 0.4)'
  },
  mintSection: {
    textAlign: 'center',
    marginBottom: '50px',
    padding: '40px',
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderRadius: '12px',
    border: '1px dashed #00d4ff'
  },
  mintBtn: {
    padding: '15px 50px',
    fontSize: '1.2rem',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid #00d4ff',
    backgroundColor: '#00d4ff',
    color: '#1a1a1a',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)'
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '40px'
  },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '20px',
    borderRadius: '12px'
  },
  panelTitle: {
    borderBottom: '2px solid #333',
    paddingBottom: '10px',
    marginBottom: '20px',
    color: '#fff',
    fontSize: '1.5rem',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  gridList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '20px'
  },
  oreCard: {
    backgroundColor: '#2a2a2a',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #444',
    transition: 'transform 0.2s',
    position: 'relative',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  oreVisual: {
    height: '100px',
    backgroundColor: '#1f1f1f',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    marginBottom: '15px',
    border: '1px solid #333',
    color: '#555',
    fontSize: '1.2rem'
  },
  refineryCard: {
    backgroundColor: '#2a2a2a',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #2ecc71', // Green border for active
    position: 'relative',
    boxShadow: '0 0 15px rgba(46, 204, 113, 0.1)'
  },
  refineryVisual: {
    height: '100px',
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    marginBottom: '15px',
    border: '1px dashed #2ecc71',
    color: '#2ecc71',
    flexDirection: 'column',
    gap: '5px'
  },
  pulse: {
    animation: 'pulse 2s infinite',
    color: '#2ecc71'
  },
  stakeBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '2px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    backgroundColor: '#00d4ff',
    color: '#000'
  },
  unstakeBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    backgroundColor: 'transparent',
    border: '1px solid #2ecc71',
    color: '#2ecc71'
  },
  emptyText: {
    color: '#555',
    fontStyle: 'italic',
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '20px'
  }
};

export default App;