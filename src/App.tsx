import { useEffect, useState } from "react";
import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";
import toast, { Toaster } from "react-hot-toast";
import FrenchLearnerABI from "./abi/FrenchLearnerABI.json";
import "./App.css";
import flagOfFrance from "../Flag_of_France.png";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// environment variables better
const CONTRACT_ADDRESS = "0xDEBDf592ed9CA468846d508Dfe7Eda5212A656F7";
const SEPOLIA_CHAIN_ID = "0xaa36a7";

interface StakeInfo {
  active: boolean;
  amount: number;
  startTime: number;
}

function App() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(() => {
    const stored = localStorage.getItem("frenchlearner_wallet");
    // Validate that the stored value looks like an Ethereum address
    if (stored && stored.match(/^0x[a-fA-F0-9]{40}$/)) {
      return stored;
    }
    return null;
  });
  const [contract, setContract] = useState<Contract | null>(null);
  const [networkOk, setNetworkOk] = useState<boolean>(false);
  const [faucetClaimed, setFaucetClaimed] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [tokens, setTokens] = useState<number>(0);
  const [lastComp, setLastComp] = useState<number>(0);
  const [stakeInfo, setStakeInfo] = useState<StakeInfo>({
    active: false,
    amount: 0,
    startTime: 0,
  });
  const [stakeAmount, setStakeAmount] = useState<string>("");

  const [stakeCountdown, setStakeCountdown] = useState<string>("");

  useEffect(() => {
    const initializeApp = async () => {
      if (window.ethereum) {
        try {
          const p = new BrowserProvider(window.ethereum);
          setProvider(p);

          // Check network
          const chainId = await window.ethereum.request({
            method: "eth_chainId",
          });
          setNetworkOk(chainId === SEPOLIA_CHAIN_ID);

          // Set up chain change listener
          window.ethereum.on("chainChanged", (chainId: string) => {
            setNetworkOk(chainId === SEPOLIA_CHAIN_ID);
            window.location.reload();
          });

          // Check if wallet is connected - use a more robust approach
          const accounts = await p.listAccounts();

          if (accounts.length > 0) {
            // Extract address safely - handle different formats
            let addr: string;

            if (typeof accounts[0] === "string") {
              addr = accounts[0];
            } else if (accounts[0] && typeof accounts[0] === "object") {
              // Handle case where account might be an object
              addr = accounts[0].address || String(accounts[0]);
            } else {
              addr = String(accounts[0]);
            }

            // Validate it's actually an Ethereum address
            if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
              console.error("Invalid address format from MetaMask:", addr);
              setAddress(null);
              localStorage.removeItem("frenchlearner_wallet");
              return;
            }

            console.log("Wallet connected:", addr);

            setAddress(addr);
            localStorage.setItem("frenchlearner_wallet", addr);

            const s = await p.getSigner();
            setSigner(s);
            const c = new Contract(CONTRACT_ADDRESS, FrenchLearnerABI, s);
            setContract(c);
            await loadUserInfo(c, addr);
          } else {
            // No wallet connected
            console.log("No wallet connected");
            setAddress(null);
            localStorage.removeItem("frenchlearner_wallet");
          }
        } catch (error) {
          console.error("Error initializing app:", error);
          setAddress(null);
          localStorage.removeItem("frenchlearner_wallet");
        }
      }
    };

    initializeApp();
  }, []);

  const disconnect = () => {
    setAddress(null);
    setSigner(null);
    setContract(null);
    localStorage.removeItem("frenchlearner_wallet");
    toast("Disconnected 👋", { icon: "❌" });
  };

  useEffect(() => {
    if (stakeInfo.active) {
      const interval = setInterval(() => {
        const endTime = stakeInfo.startTime * 1000 + 7 * 24 * 60 * 60 * 1000;
        const remaining = endTime - Date.now();
        if (remaining <= 0) {
          setStakeCountdown("Ready to claim ✅");
          clearInterval(interval);
        } else {
          const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          setStakeCountdown(`${days}d ${hours}h left`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stakeInfo]);

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Test Network",
              nativeCurrency: {
                name: "SepoliaETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://sepolia.infura.io/v3/"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      }
    }
  };

  const connect = async (silent = false) => {
    if (!provider) {
      toast.error("MetaMask not found");
      return;
    }

    if (!networkOk) {
      await switchToSepolia();
      return;
    }

    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length === 0) return toast.error("No accounts found");

      // Robust address extraction
      let addr: string;
      if (typeof accounts[0] === "string") {
        addr = accounts[0];
      } else if (accounts[0] && typeof accounts[0] === "object") {
        addr = accounts[0].address || String(accounts[0]);
      } else {
        addr = String(accounts[0]);
      }

      // Validate address format
      if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
        console.error("Invalid address format after connection:", addr);
        toast.error("Invalid wallet address received");
        return;
      }

      console.log("Connecting with validated address:", addr);
      setAddress(addr);
      localStorage.setItem("frenchlearner_wallet", addr);

      const s = await provider.getSigner();
      setSigner(s);
      const c = new Contract(CONTRACT_ADDRESS, FrenchLearnerABI, s);
      setContract(c);
      await loadUserInfo(c, addr);

      if (!silent) toast.success("Wallet connected 🎉");
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect wallet");
    }
  };

  const loadUserInfo = async (c: Contract, addr: string) => {
    try {
      const info = await c.getUserInfo(addr);
      setStreak(Number(info[0]));
      setTokens(Number(info[1]));
      setLastComp(Number(info[2]));
      setStakeInfo({
        active: info[3],
        amount: Number(info[4]),
        startTime: Number(info[5]),
      });
      setFaucetClaimed(info[6]);
    } catch (e) {
      console.error(e);
    }
  };

  const runTx = async (fn: () => Promise<any>, msg: string) => {
    try {
      // Validate current address before running transaction
      if (!address || typeof address !== "string") {
        console.error("Invalid address state in runTx:", address);
        toast.error("Wallet address is invalid, please reconnect");
        return;
      }

      const tx = await fn();
      toast.loading(`${msg}...`, { id: msg });
      await tx.wait();
      await loadUserInfo(contract!, address);
      toast.success(`${msg} confirmed ✅`, { id: msg });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.info?.error?.message || e.message);
    }
  };

  const claimFaucet = async () =>
    runTx(() => contract!.faucet(), "Claiming starter pack");

  const completeLesson = async () =>
    runTx(() => contract!.completeDailyLesson(), "Completing lesson");

  const doStake = async () => {
    const amt = parseInt(stakeAmount, 10);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    runTx(() => contract!.stakeForWeek(amt), "Staking FREN");
    setStakeAmount("");
  };

  const claimStake = async () =>
    runTx(() => contract!.claimStake(), "Claiming stake");

  return (
    <div className="app">
      <Toaster />
      <div className="card">
        <h1>
          <img src={flagOfFrance} className="flag" alt="flag of france" />{" "}
          FrenchLearnerDAO
        </h1>
        {!networkOk && <p className="warn">⚠️ Please switch to Sepolia</p>}

        {!address ? (
          <div>
            <h2>Bienvenue!</h2>
            <p>Connect your wallet to start your French journey 🥖🗼</p>
            <button className="btn" onClick={() => connect(false)}>
              Connect MetaMask
            </button>
          </div>
        ) : (
          <div>
            <p>
              👛{" "}
              <strong>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </strong>{" "}
              <button className="btn small" onClick={disconnect}>
                Disconnect
              </button>
            </p>
            <p>
              💰 Balance: <strong>{tokens}</strong> FREN
            </p>
            <p>
              🔥 Streak: <strong>{streak}</strong>
            </p>
            <p>
              📅 Last lesson:{" "}
              {lastComp ? new Date(lastComp * 1000).toLocaleString() : "Never"}
            </p>

            {/* Add the faucet claim button */}
            {!faucetClaimed && (
              <button className="btn" onClick={claimFaucet}>
                🎁 Claim Starter Pack (50 FREN)
              </button>
            )}

            <button className="btn" onClick={completeLesson}>
              I learned French today! 📘
            </button>

            <hr />
            <h3>🏆 Weekly Challenge</h3>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount"
              className="input"
            />
            <button className="btn" onClick={doStake}>
              Stake for week
            </button>
            <button
              className="btn"
              onClick={claimStake}
              disabled={!stakeInfo.active}
            >
              Claim stake
            </button>

            {stakeInfo.active && (
              <div className="stake-info">
                Active stake: {stakeInfo.amount} FREN <br />⏳ {stakeCountdown}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
