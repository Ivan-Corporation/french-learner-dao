# FrenchLearnerDAO - Gamify Your French Learning Journey

Learn French. Earn FREN. Build Streaks. Master the Language through Web3 Gamification!

## What is FrenchLearnerDAO?

FrenchLearnerDAO is an innovative Web3-powered language learning platform that transforms your French learning journey into an engaging, gamified experience. Built on the Ethereum Sepolia testnet, this dApp rewards consistent learning with virtual FREN tokens while helping you build sustainable study habits.

### Key Features

- **Daily Learning Rewards**: Earn FREN tokens for consistent French practice
- **Streak System**: Maintain your learning momentum with visual progress tracking
- **Weekly Staking Challenges**: Lock tokens for 7 days to earn 150% returns
- **Starter Pack Faucet**: Get 50 FREN tokens to begin your journey
- **Gas-Optimized**: Efficient smart contract design for minimal transaction costs
- **Non-ERC20 Virtual Tokens**: Internal balance system for seamless user experience

## Quick Start

### Prerequisites

- **MetaMask Wallet** installed in your browser
- **Sepolia ETH** for gas fees (Get test ETH from sepoliafaucet.com)
- **Basic French enthusiasm**!

### Getting Started

1. **Visit the dApp** and connect your MetaMask wallet
2. **Switch to Sepolia Network** (automatic prompt will help you)
3. **Claim Your Starter Pack** - Get 50 FREN tokens to begin
4. **Start Learning** - Click "I learned French today!" to begin your streak
5. **Explore Staking** - Try the weekly challenge for bonus rewards!

## How It Works

### Daily Learning System

| Feature | Description | Reward |
|---------|-------------|---------|
| **Base Daily Lesson** | Mark your daily French study | 10 FREN |
| **7+ Day Streak Bonus** | Maintain consistency for a week | +5 FREN bonus |
| **Anti-Spam Protection** | Prevent abuse (20-hour cooldown) | - |
| **Streak Reset** | Miss >48 hours? Reset and rebuild | - |

### Staking Challenge

Stake your FREN for 7 days:
- Success (streak ≥ 7): Get 150% return! 
- Failure (streak < 7): Tokens are slashed

**Example**: Stake 100 FREN → Maintain 7-day streak → Receive 150 FREN!

## For Developers

### Smart Contract Features

**Contract Address**: 0xDEBDf592ed9CA468846d508Dfe7Eda5212A656F7

#### Core Functions
// User Actions
function completeDailyLesson() external
function stakeForWeek(uint256 amount) external
function claimStake() external
function faucet() external

// View Functions
function getUserInfo(address user) external view returns (
uint256 streak,
uint256 tokens,
uint256 lastCompletion,
bool hasActiveStake,
uint256 stakeAmount,
uint256 stakeStart,
bool faucetClaimed
)

text

#### Key Constants
ANTI_SPAM = 20 hours // Prevent spam
STREAK_RESET = 48 hours // Streak reset threshold
DAILY_REWARD = 10 FREN // Base reward
BONUS_AFTER = 7 days // Streak bonus threshold
STAKE_DURATION = 7 days // Staking period
STAKE_MULTIPLIER = 150% // Success reward
FAUCET_AMOUNT = 50 FREN // Starter tokens

text

### Frontend Technology Stack

- **React 18** with TypeScript for type safety
- **Ethers.js v6** for blockchain interactions
- **React Hot Toast** for beautiful notifications
- **Modern Hooks** for state management
- **Local Storage** for session persistence
- **MetaMask Integration** with multi-wallet support

## User Interface Tour

### Landing Page
- **Welcoming French-themed design** with flag branding
- **One-click MetaMask connection** with network validation
- **Automatic wallet detection** and session persistence

### Dashboard
- **Wallet Address Display** (truncated for security)
- **Real-time Balance** showing FREN tokens
- **Streak Counter** with visual motivation
- **Last Lesson Timestamp** for progress tracking
- **Starter Pack Claim** for new users

### Actions Panel
- **Daily Lesson Button** - Core learning interaction
- **Staking Interface** - Amount input and stake management
- **Countdown Timer** - Visual stake progress indicator
- **Claim Button** - Stake completion with streak validation

## Advanced Features

### Smart Contract Optimizations

- **Single Function Call**: getUserInfo() reduces RPC overhead
- **Gas-Efficient Storage**: Packed structs and mappings
- **Anti-Gaming Mechanics**: 20-hour cooldown and streak resets
- **View Function Optimization**: Minimal state reads

### Frontend Innovations

- **Robust Wallet Handling**: Supports MetaMask's multi-account system
- **Error Resilience**: Comprehensive error handling and user feedback
- **Auto-Reconnection**: Seamless session recovery
- **Network Management**: Automatic Sepolia network switching

## Use Cases & Benefits

### For Language Learners
- **Gamified Motivation**: Turn language learning into an engaging game
- **Consistency Building**: Streak system encourages daily practice
- **Tangible Rewards**: Virtual tokens provide achievement feedback
- **Community Aspect**: DAO structure enables future community features

### For Web3 Developers
- **Educational Example**: Complete dApp with modern best practices
- **Gas Optimization**: Learn efficient smart contract patterns
- **User Experience**: See how to make Web3 accessible to non-technical users
- **Testing Ground**: Perfect for experimenting with token economics

## Important Notes

### Disclaimer
- **Testnet Only**: Currently deployed on Sepolia testnet
- **Virtual Tokens**: FREN tokens are internal balances, not ERC20
- **Educational Purpose**: Primarily for demonstration and learning

### Future Roadmap
- [ ] ERC-20 token migration
- [ ] NFT achievements for milestones
- [ ] Community governance features
- [ ] Multi-language expansion
- [ ] Mobile app development

## Contributing

We welcome contributions from developers, language enthusiasts, and Web3 explorers! Areas where you can help:

- **UI/UX Improvements**
- **Smart Contract Optimizations**
- **Additional Language Support**
- **Documentation Enhancements**
- **Testing and Bug Reports**

## License

This project is licensed under the MIT License.

---

**Bonne chance et bon apprentissage!**

*"The limits of my language mean the limits of my world." - Ludwig Wittgenstein*

---

Made with ❤️ for the French learning community

***
// OLD behavior (what we expected):
const accounts = await provider.send("eth_requestAccounts", []);
// accounts = ["0x123...", "0x456..."] - simple string array

// NEW behavior (what we might get):
const accounts = await provider.send("eth_requestAccounts", []);
// accounts could be: 
// - Still string array: ["0x123..."]
// - Object array: [{address: "0x123...", ...}]
// - Mixed formats depending on wallet extensions
***