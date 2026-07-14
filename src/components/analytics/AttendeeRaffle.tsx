"use client";

import { useState, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL, TransactionInstruction } from "@solana/web3.js";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Users,
  Gift,
  Coins,
  Search,
  RefreshCw,
  Trophy,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Wallet
} from "lucide-react";
import { type TopUser } from "@/src/api/events";

// Deterministic valid Solana public keys mapped to mock users
const MOCK_WALLETS: Record<string, string> = {
  vitalik_fan: "HN7cWZ4S4yYn6FTrh4Eq2uP6bJp2s5n8Hk27a819b10m",
  alex_sol: "5W34s5T3yYn6FTkbF3X2uP6bJp2s5n8Hk27a819b10m",
  mary_crypto: "8G43wZ4S4yYn1FTcbF3Z2uP6bJp2s5n8Hk27a819b10m",
  next_pioneer: "2X56wZ4S4yYn1FTdbF9Y2uP6bJp2s5n8Hk27a819b10m",
  crypto_ninja: "3Y78wZ4S4yYn1FTeF7Z2uP6bJp2s5n8Hk27a819b10m",
  hacker_guy: "4Z89wZ4S4yYn1FTfF6Z2uP6bJp2s5n8Hk27a819b10m",
  sol_maxi: "2B89wZ4S4yYn1FTgF6X2uP6bJp2s5n8Hk27a819b10m",
  alice_w3: "3C89wZ4S4yYn1FThF6Y2uP6bJp2s5n8Hk27a819b10m",
  bob_builder: "4D89wZ4S4yYn1FTiF6Z2uP6bJp2s5n8Hk27a819b10m",
  charlie_dev: "5E89wZ4S4yYn1FTjF6A2uP6bJp2s5n8Hk27a819b10m",
  dave_nft: "6F89wZ4S4yYn1FTkF6B2uP6bJp2s5n8Hk27a819b10m",
  eve_solana: "7G89wZ4S4yYn1FTlF6C2uP6bJp2s5n8Hk27a819b10m",
  frank_web3: "8H89wZ4S4yYn1FTmF6D2uP6bJp2s5n8Hk27a819b10m",
  grace_ninja: "9I89wZ4S4yYn1FTnF6E2uP6bJp2s5n8Hk27a819b10m",
};

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDT_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");

const isValidSolanaAddress = (addr: string): boolean => {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
};

const getCleanAddress = (username: string, addr?: string): string => {
  if (addr && isValidSolanaAddress(addr)) return addr;
  return MOCK_WALLETS[username] || "4k3DyjzvzpEs41D6y289as71bM4rD8z9zKk27a819b10";
};

// Pure helper function defined outside the component body to satisfy strict ESLint rules
const getRandomArrayElement = <T,>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Find the Associated Token Account (ATA) of a wallet for a token mint
const getAssociatedTokenAddress = (mint: PublicKey, owner: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      owner.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer()
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

// Construct manual SPL Token Transfer instruction (compatible with pure web3.js)
const createSPLTransferInstruction = (
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: number
): TransactionInstruction => {
  const data = new Uint8Array(9);
  data[0] = 3; // Transfer index
  let temp = amount;
  for (let i = 1; i <= 8; i++) {
    data[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  return new TransactionInstruction({
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    programId: TOKEN_PROGRAM_ID,
    data: Buffer.from(data)
  });
};

interface Props {
  attendees: TopUser[];
  isLoading: boolean;
  selectedEventId: number | null;
}

type PrizeType = "crypto" | "merch" | "vip" | "nft" | "other";
type CryptoToken = "SOL" | "USDC" | "USDT";

interface WinnerInfo {
  user: TopUser;
  wallet: string;
}

export default function AttendeeRaffle({ attendees = [], isLoading }: Props) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  // Search & directory state
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Raffle configurations
  const [prizeType, setPrizeType] = useState<PrizeType>("crypto");
  const [cryptoToken, setCryptoToken] = useState<CryptoToken>("SOL");
  const [prizeAmount, setPrizeAmount] = useState<number>(0.1);
  const [prizeName, setPrizeName] = useState("");
  const [winnersCount, setWinnersCount] = useState<number>(3);

  // Raffle execution states
  const [isDrawing, setIsDrawing] = useState(false);
  const [cyclerName, setCyclerName] = useState("");
  const [winners, setWinners] = useState<WinnerInfo[]>([]);
  const [drawCompleted, setDrawCompleted] = useState(false);

  // Transaction states
  const [txStatus, setTxStatus] = useState<"idle" | "building" | "signing" | "broadcasting" | "confirmed" | "failed">("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Clean and prepare attendee list with valid Solana addresses
  const cleanAttendees = useMemo(() => {
    return attendees.map(u => ({
      ...u,
      wallet_address: getCleanAddress(u.username, u.wallet_address)
    }));
  }, [attendees]);

  // Filtered attendees based on search query
  const filteredAttendees = useMemo(() => {
    return cleanAttendees.filter(u =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cleanAttendees, searchQuery]);

  const handleCopyWallet = (address: string, idx: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Perform raffle drawing with quick cycling animation
  const handleDrawWinners = () => {
    if (cleanAttendees.length === 0) return;
    setIsDrawing(true);
    setDrawCompleted(false);
    setTxStatus("idle");
    setTxSignature(null);
    setTxError(null);

    const actualWinnersCount = Math.min(winnersCount, cleanAttendees.length);

    // Fast cycling username lottery effect
    let cycles = 0;
    const interval = setInterval(() => {
      const randomUser = getRandomArrayElement(cleanAttendees);
      setCyclerName(randomUser.username);
      cycles++;

      if (cycles > 25) {
        clearInterval(interval);

        // Select distinct winners randomly
        const shuffled = [...cleanAttendees].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, actualWinnersCount).map(u => ({
          user: u,
          wallet: u.wallet_address || "4k3DyjzvzpEs41D6y289as71bM4rD8z9zKk27a819b10"
        }));

        setWinners(selected);
        setIsDrawing(false);
        setDrawCompleted(true);
      }
    }, 75);
  };

  // Reroll single winner spot
  const handleRerollWinner = (indexToReroll: number) => {
    if (cleanAttendees.length <= winners.length) return; // Pool too small to redraw distinct

    const currentWinnerIds = new Set(winners.map(w => w.user.user_id));
    const eligiblePool = cleanAttendees.filter(u => !currentWinnerIds.has(u.user_id));

    if (eligiblePool.length === 0) return;

    const newWinner = getRandomArrayElement(eligiblePool);
    const updatedWinners = [...winners];
    updatedWinners[indexToReroll] = {
      user: newWinner,
      wallet: newWinner.wallet_address || "4k3DyjzvzpEs41D6y289as71bM4rD8z9zKk27a819b10"
    };

    setWinners(updatedWinners);
    // Reset tx status because winners modified
    setTxStatus("idle");
    setTxSignature(null);
    setTxError(null);
  };

  // Distribute crypto to winners (Solana wallet transaction)
  const handleSendPrizes = async () => {
    if (winners.length === 0) return;
    setTxError(null);

    const isRealWallet = connected && publicKey;
    if (!isRealWallet) {
      setVisible(true);
      return;
    }

    const allWalletsValid = winners.every(w => isValidSolanaAddress(w.wallet));
    if (!allWalletsValid) {
      setTxError("Some winner wallets are not valid Solana addresses.");
      setTxStatus("failed");
      return;
    }

    setTxStatus("building");
    try {
      const transaction = new Transaction();

      if (cryptoToken === "SOL") {
        winners.forEach(w => {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey!,
              toPubkey: new PublicKey(w.wallet),
              lamports: Math.round(prizeAmount * LAMPORTS_PER_SOL),
            })
          );
        });
      } else {
        // USDC or USDT SPL token transfers
        const mintAddress = cryptoToken === "USDC" ? USDC_MINT : USDT_MINT;
        const decimals = 6;
        const baseAmount = Math.round(prizeAmount * Math.pow(10, decimals));

        for (const w of winners) {
          const recipientPubKey = new PublicKey(w.wallet);
          const sourceATA = getAssociatedTokenAddress(mintAddress, publicKey!);
          const destinationATA = getAssociatedTokenAddress(mintAddress, recipientPubKey);

          // Check if recipient's ATA exists; if not, create it first
          const ataInfo = await connection.getAccountInfo(destinationATA);
          if (!ataInfo) {
            // Create Associated Token Account instruction (manual construction)
            transaction.add(
              new TransactionInstruction({
                keys: [
                  { pubkey: publicKey!, isSigner: true, isWritable: true },   // payer
                  { pubkey: destinationATA, isSigner: false, isWritable: true }, // ATA to create
                  { pubkey: recipientPubKey, isSigner: false, isWritable: false }, // wallet owner
                  { pubkey: mintAddress, isSigner: false, isWritable: false },    // token mint
                  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
                  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },       // token program
                ],
                programId: ASSOCIATED_TOKEN_PROGRAM_ID,
                data: Buffer.alloc(0), // no data needed for create ATA
              })
            );
          }

          transaction.add(
            createSPLTransferInstruction(
              sourceATA,
              destinationATA,
              publicKey!,
              baseAmount
            )
          );
        }
      }

      setTxStatus("signing");
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey!;

      const signature = await sendTransaction(transaction, connection);
      
      setTxStatus("broadcasting");
      setTxSignature(signature);

      // Poll for confirmation via getSignatureStatuses (HTTP-based, no WebSocket needed)
      const maxRetries = 30;
      for (let i = 0; i < maxRetries; i++) {
        const { value } = await connection.getSignatureStatuses([signature]);
        const status = value?.[0];
        if (status) {
          if (status.err) {
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.err)}`);
          }
          if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
            break;
          }
        }
        if (i === maxRetries - 1) {
          throw new Error("Transaction confirmation timed out. Check Solana Explorer for status.");
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      setTxStatus("confirmed");
    } catch (err: unknown) {
      console.error("Solana transaction error:", err);
      const errorMsg = err instanceof Error ? err.message : "Transaction rejected or failed.";
      setTxError(errorMsg);
      setTxStatus("failed");
    }
  };

  return (
    <div className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 md:p-6 shadow-sm backdrop-blur-md relative overflow-hidden transition-all mt-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 border-b border-black/5 dark:border-white/5 pb-4">
        <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
          <Trophy className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">Event Engagement Tools</h3>
          <h4 className="text-base font-display font-extrabold uppercase tracking-tight text-black dark:text-white mt-0.5">Attendee Raffle & Solana Giveaway</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Directory */}
        <div className="lg:col-span-7 flex flex-col min-h-[420px]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] tracking-widest text-[#00e0c2] font-mono font-bold uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Attendee Directory ({cleanAttendees.length})
            </span>

            <div className="relative w-44 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8.5 pr-3 py-1.5 bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-lg outline-none text-black dark:text-white placeholder-white/20 focus:border-[#00e0c2]/50 focus:bg-[#00e0c2]/[0.01]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[380px] pr-1.5 custom-scrollbar border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] rounded-xl p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-white/35 font-mono">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#00e0c2]" /> Loading directory...
              </div>
            ) : filteredAttendees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30 py-16">
                <Users className="w-8 h-8 opacity-20 mb-2" />
                <span className="text-xs font-mono">No attendees match search</span>
              </div>
            ) : (
              filteredAttendees.map((user, idx) => {
                const walletShort = user.wallet_address
                  ? `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-8)}`
                  : "—";

                return (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/30 hover:bg-black/5 dark:hover:bg-white/[0.02] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-white/5 relative">
                        {user.avatar ? (
                          <Image src={user.avatar} alt={user.username} width={32} height={32} unoptimized className="w-full h-full object-cover" />
                        ) : (
                          <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.username} width={32} height={32} unoptimized className="w-full h-full object-cover opacity-60" />
                        )}
                      </div>
                      <div>
                        <div className="text-black dark:text-white font-semibold text-xs tracking-tight">{user.username}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-black/50 dark:text-white/40 font-mono tracking-tight">{walletShort}</span>
                          <button
                            onClick={() => handleCopyWallet(user.wallet_address || "", idx)}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/5 text-white/30 hover:text-[#00e0c2] transition-colors cursor-pointer"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-[#00e0c2]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs text-black/75 dark:text-white/80 font-bold">{user.total_taps} T</div>
                      <div className="font-mono text-[9px] text-black/40 dark:text-white/40 font-bold uppercase">{user.total_reputation} rep</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Giveaway Manager */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-black/5 dark:border-white/5 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] tracking-widest text-[#00e0c2] font-mono font-bold uppercase flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Draw Panel
            </span>

            {/* Prize Type Toggle */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Select Prize Type</label>
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-black/10 dark:bg-white/5 border border-white/5 rounded-xl text-xs font-display font-extrabold uppercase text-center tracking-wide">
                {(["crypto", "merch", "vip", "nft", "other"] as PrizeType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setPrizeType(type)}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${prizeType === type ? "bg-[var(--accent-primary)] text-white shadow" : "text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white"}`}
                  >
                    {type === "crypto" ? "Coin" : type === "vip" ? "VIP" : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Form Fields */}
            {prizeType === "crypto" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Token</label>
                  <select
                    value={cryptoToken}
                    onChange={e => setCryptoToken(e.target.value as CryptoToken)}
                    className="w-full text-xs bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white font-mono focus:outline-none focus:border-[#00e0c2]"
                  >
                    <option value="SOL" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">SOL</option>
                    <option value="USDC" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">USDC</option>
                    <option value="USDT" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">USDT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Amt / Winner</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={prizeAmount}
                    onChange={e => setPrizeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-black dark:text-white font-mono focus:outline-none focus:border-[#00e0c2]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Prize Description</label>
                <input
                  type="text"
                  placeholder="e.g. NextVibe Premium Black Hoodie"
                  value={prizeName}
                  onChange={e => setPrizeName(e.target.value)}
                  className="w-full text-xs bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white font-mono focus:outline-none focus:border-[#00e0c2]"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Number of Winners</label>
              <input
                type="number"
                min="1"
                max={Math.max(1, cleanAttendees.length)}
                value={winnersCount}
                onChange={e => setWinnersCount(parseInt(e.target.value) || 1)}
                className="w-full text-xs bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-black dark:text-white font-mono focus:outline-none focus:border-[#00e0c2]"
              />
            </div>

            {/* Wallet status */}
            {prizeType === "crypto" && (
              <div className="p-3.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/[0.01] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" : "bg-white/20"}`} />
                  <span className="font-mono text-black/60 dark:text-white/40">
                    {connected && publicKey
                      ? `Wallet: ${publicKey.toBase58().slice(0, 6)}…${publicKey.toBase58().slice(-6)}`
                      : "Wallet: Not Connected"}
                  </span>
                </div>
                {!connected ? (
                  <button
                    onClick={() => setVisible(true)}
                    className="px-3 py-1.5 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/40 text-[var(--accent-primary)] rounded-lg font-display text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Connect
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase">Ready</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {/* Draw CTA Button */}
            <button
              onClick={handleDrawWinners}
              disabled={isDrawing || cleanAttendees.length === 0}
              className="w-full h-11 bg-gradient-to-r from-[#00e0c2] to-[#a855f7] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-black font-display font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDrawing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Drawing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  Draw Winners
                </>
              )}
            </button>

            {/* Animation state */}
            {isDrawing && (
              <div className="h-16 flex items-center justify-center border border-[#00e0c2]/30 bg-[#00e0c2]/5 rounded-xl overflow-hidden font-display text-lg font-extrabold uppercase tracking-wider text-[#00e0c2] animate-pulse">
                {cyclerName}
              </div>
            )}

            {/* Winners & Transaction Section */}
            {drawCompleted && winners.length > 0 && !isDrawing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-[10px] tracking-widest text-yellow-500 font-mono font-bold uppercase flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Selected Winners
                </span>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {winners.map((w, idx) => (
                    <div
                      key={w.user.user_id}
                      className="p-2.5 border border-white/5 bg-white/50 dark:bg-black/40 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-yellow-500/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-white/5 relative">
                          {w.user.avatar ? (
                            <Image src={w.user.avatar} alt={w.user.username} width={32} height={32} unoptimized className="w-full h-full object-cover" />
                          ) : (
                            <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${w.user.username}`} alt={w.user.username} width={32} height={32} unoptimized className="w-full h-full object-cover opacity-60" />
                          )}
                        </div>
                        <div>
                          <div className="text-black dark:text-white font-bold text-xs flex items-center gap-1.5">
                            <span className="w-4 text-center font-mono font-bold text-yellow-500">#{idx + 1}</span>
                            <span>{w.user.username}</span>
                          </div>
                          <div className="text-[9px] text-black/50 dark:text-white/40 font-mono mt-0.5">
                            {w.wallet.slice(0, 6)}…{w.wallet.slice(-6)}
                          </div>
                        </div>
                      </div>

                      {/* Reroll single win button */}
                      <button
                        onClick={() => handleRerollWinner(idx)}
                        disabled={txStatus !== "idle" && txStatus !== "confirmed"}
                        className="p-2 border border-black/10 dark:border-white/5 hover:border-[#00e0c2]/20 hover:bg-[#00e0c2]/10 text-white/40 hover:text-[#00e0c2] rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Reroll this winner"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Crypto Prize Distribute Panel */}
                {prizeType === "crypto" && (
                  <div className="pt-2">
                    {txStatus === "idle" && (
                      <button
                        onClick={handleSendPrizes}
                        className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.01] active:scale-[0.99] text-white font-display font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Coins className="w-4 h-4 text-white" />
                        Send {prizeAmount} {cryptoToken} to Winners
                      </button>
                    )}

                    {txStatus !== "idle" && (
                      <div className="p-4 border border-[#00e0c2]/20 bg-[#00e0c2]/5 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-white/50">Transaction status</span>
                          {txStatus !== "confirmed" && txStatus !== "failed" && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00e0c2]" />
                          )}
                        </div>

                        {/* Status descriptions */}
                        {txStatus === "building" && (
                          <div className="text-xs font-mono text-white/70">Connecting to Solana RPC and building Instructions...</div>
                        )}
                        {txStatus === "signing" && (
                          <div className="text-xs font-mono text-[#00e0c2] animate-pulse">
                            Awaiting transaction signature in wallet...
                          </div>
                        )}
                        {txStatus === "broadcasting" && (
                          <div className="text-xs font-mono text-white/70">Broadcasting transaction and waiting for confirmation...</div>
                        )}
                        {txStatus === "confirmed" && (
                          <div className="space-y-2">
                            <div className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-400" /> Transaction confirmed successfully!
                            </div>
                            {txSignature && (
                              <a
                                href={`https://explorer.solana.com/tx/${txSignature}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-mono text-[#00e0c2] hover:underline flex items-center gap-1 w-fit"
                              >
                                View on Solana Explorer <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                        {txStatus === "failed" && (
                          <div className="space-y-1 text-xs font-mono text-red-400">
                            <div className="font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-red-400" /> Transaction failed
                            </div>
                            <div className="text-[10px] text-white/50">{txError}</div>
                          </div>
                        )}

                        {/* Reset button to roll again or redo */}
                        {(txStatus === "confirmed" || txStatus === "failed") && (
                          <button
                            onClick={() => setTxStatus("idle")}
                            className="mt-2 text-[10px] font-mono uppercase font-bold text-white/40 hover:text-white transition-colors cursor-pointer block underline"
                          >
                            Reset Transaction
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
