import axios, { AxiosError } from "axios";
import { storage } from "../utils/storage";
import getApiUrl from "../utils/url_api";
import { latLngToCell } from "h3-js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LumaLocation {
  name?: string | null;
  address?: string | null;
  url?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface LumaEventPreview {
  url?: string | null;
  title?: string | null;
  cover_image?: string | null;
  description?: string | null;
  location?: LumaLocation | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface PreviewResult {
  event: LumaEventPreview;
  code: string;
}

export interface VerifyResult {
  verified: boolean;
  code: string;
  event: LumaEventPreview;
}

export interface CreateEventPostPayload {
  about: string;
  owner: number;
  location?: string;
  coords: { lat: number; lng: number };
  resolution: number;
  is_ai_generated: boolean;
  is_comments_enabled: boolean;
  is_luma_event: boolean;
  luma_event_url: string;
  luma_event_verified: boolean;
  luma_event_start_time?: string;
  luma_event_end_time?: string;
}

export interface TopUser {
  user_id: number;
  username: string;
  wallet_address: string;
  avatar: string;
  total_taps: number;
  total_reputation: number;
}

export interface EcosystemStats {
  total_users: number;
  mwa_wallet_users: number;
  web2_users: number;
  mwa_percentage: number;
  web2_percentage: number;
}

export interface HourlyActivityItem {
  hour: string;
  checkins: number;
  networking: number;
  total: number;
}

export interface EventAnalyticsData {
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  nfc_checkins: number;
  total_irl_taps: number;
  total_reputation_earned: number;
  cnft_claims_count: number;
  cnft_claim_rate: number;
  ecosystem_stats: EcosystemStats;
  hourly_activity: HourlyActivityItem[];
}

export interface SocialNode {
  id: number;
  label: string;
  avatar: string | null;
  connections_count: number;
  reputation_earned: number;
  is_super_connector: boolean;
  is_organizer?: boolean;
}

export interface SocialEdge {
  source: number;
  target: number;
  weight: number;
}

export interface SocialGraphData {
  nodes: SocialNode[];
  edges: SocialEdge[];
}

export interface BroadcastResult {
  success: boolean;
  message: string;
  recipients_count: number;
}

// ─── Error Extraction ────────────────────────────────────────────────────────

export function extractBackendError(e: unknown): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data;
    if (data?.error) return data.error;
    if (data?.detail) return String(data.detail);
    if (typeof data === "object" && data !== null) {
      const first = Object.values(data)[0];
      if (Array.isArray(first)) return String(first[0]);
    }
    if (e.response?.status === 429) return "Too many requests. Please wait.";
    if (e.response?.status === 502) return "Could not reach Luma. Try again.";
    if (e.response?.status === 400) return "Bad request. Check the link.";
  }
  return "Something went wrong. Try again.";
}

// ─── Step 1: Preview Luma Event ──────────────────────────────────────────────

export async function previewLumaEvent(luma_url: string): Promise<PreviewResult> {
  const res = await axios.post(`${getApiUrl()}/posts/luma-event/preview/`, {
    luma_url,
  });
  return res.data?.data as PreviewResult;
}

// ─── Step 2: Verify Luma Event ───────────────────────────────────────────────

export async function verifyLumaEvent(luma_url: string): Promise<VerifyResult> {
  const res = await axios.post(`${getApiUrl()}/posts/luma-event/verify/`, {
    luma_url,
  });
  return res.data?.data as VerifyResult;
}

// ─── Step 3: Create Event Post ───────────────────────────────────────────────

export async function createEventPost(payload: CreateEventPostPayload): Promise<{ id: number }> {
  const res = await axios.post(`${getApiUrl()}/posts/posts/?v2=true`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

// ─── Step 4: Upload Media ────────────────────────────────────────────────────

export async function uploadEventMedia(
  postId: number,
  file: File
): Promise<{ id: number; post: number; file: string }> {
  const formData = new FormData();
  formData.append("post", String(postId));
  formData.append("media", file);

  const res = await axios.post(`${getApiUrl()}/posts/add-media/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function finalizePost(postId: number): Promise<void> {
  await axios.post(`${getApiUrl()}/posts/posts/${postId}/finalize/`);
}

// ─── Step 6: Mint cNFT (with polling) ────────────────────────────────────────

export interface MintNFTResult {
  success: boolean;
  edition?: number;
  assetId?: string;
  signature?: string;
  error?: string;
}

export async function mintNFT(postId: number): Promise<MintNFTResult> {
  try {
    const res = await axios.post(`${getApiUrl()}/posts/cnft-mint/`, {
      walletAddress: "",
      postId,
      price: 0,
      paymentSignature: "",
    });
    // The endpoint might return { success: true } or directly the mint details
    // Ensure we return an object with success indicator
    if (res.data && res.data.success !== undefined) {
      return res.data;
    }
    return { success: true, ...res.data };
  } catch (e: any) {
    const errorMsg =
      e?.response?.data?.error ||
      e?.response?.data?.detail ||
      e?.message ||
      "Unknown error";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// ─── Convenience: Full Pipeline ──────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface FullCreateEventParams {
  lumaUrl: string;
  about: string;
  location?: string;
  coords: { lat: number; lng: number };
  startTime?: string;
  endTime?: string;
  mediaFile?: File | null;
  onStep?: (step: "creating" | "uploading" | "finalizing" | "minting" | "done") => void;
}

export async function createEventFull(params: FullCreateEventParams): Promise<number> {
  const ownerId = storage.getItem("id");
  if (!ownerId) throw new Error("No user ID found");

  // Step 3 — Create the post
  params.onStep?.("creating");
  const postPayload: CreateEventPostPayload = {
    about: params.about,
    owner: Number(ownerId),
    location: params.location,
    coords: params.coords,
    resolution: 11, // Frontend uses 11
    is_ai_generated: false,
    is_comments_enabled: true,
    is_luma_event: true,
    luma_event_url: params.lumaUrl,
    luma_event_verified: true,
    luma_event_start_time: params.startTime,
    luma_event_end_time: params.endTime,
  };
  const post = await createEventPost(postPayload);

  // Step 4 — Upload media (if provided)
  if (params.mediaFile) {
    params.onStep?.("uploading");
    await uploadEventMedia(post.id, params.mediaFile);
  }

  // Step 5 — Finalize
  params.onStep?.("finalizing");
  await finalizePost(post.id);

  // Step 6 — Mint cNFT with polling
  params.onStep?.("minting");
  let retries = 0;
  const maxRetries = 20; // 20 * 3s = 60 seconds max polling
  while (retries < maxRetries) {
    const res = await mintNFT(post.id);
    if (res.success) {
      break;
    } else if (res.error === "Post is not approved.") {
      retries++;
      await sleep(3000);
    } else {
      throw new Error(res.error || "Failed to mint cNFT.");
    }
  }

  if (retries >= maxRetries) {
    throw new Error("cNFT minting timed out waiting for post approval.");
  }

  params.onStep?.("done");
  return post.id;
}

// ─── Demo Mode Utilities & Mock Data ────────────────────────────────────────

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  const userId = storage.getItem("id");
  if (userId !== "39") return false;
  return storage.getItem("demo_mode") === "true";
}

const MOCK_EVENTS = [
  {
    user_id: 1,
    post_id: 9991,
    about: "Solana Breakpoint VIP Afterparty",
    count_likes: 142,
    media: [
      {
        file_url: "https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,background=white,quality=75,width=400,height=200/event-covers/55/9fb534bc-06c8-47ad-9d58-c923f5b72166"
      }
    ],
    create_at: "2026-06-11T12:00:00Z",
    is_luma_event: true,
    luma_event_start_time: "2026-06-11T20:00:00Z",
    luma_event_end_time: "2026-06-12T02:00:00Z",
    location: "Convento do Beato, Lisbon"
  },
  {
    user_id: 1,
    post_id: 9992,
    about: "NextVibe Founders Summit",
    count_likes: 89,
    media: [
      {
        file_url: "https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,background=white,quality=75,width=400,height=200/event-covers/q7/28c11fb3-8356-4c74-8ab3-774fbe8ea073"
      }
    ],
    create_at: "2026-06-10T10:00:00Z",
    is_luma_event: true,
    luma_event_start_time: "2026-06-10T14:00:00Z",
    luma_event_end_time: "2026-06-10T22:00:00Z",
    location: "UNIT.City, Kyiv"
  },
  {
    user_id: 1,
    post_id: 9993,
    about: "Kyiv Web3 Hackathon Night",
    count_likes: 64,
    media: [
      {
        file_url: "https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,background=white,quality=75,width=400,height=200/event-covers/d2/836102da-c205-4c0f-90e6-a36c92d53bf3"
      }
    ],
    create_at: "2026-06-09T09:00:00Z",
    is_luma_event: true,
    luma_event_start_time: "2026-06-09T18:00:00Z",
    luma_event_end_time: "2026-06-09T23:30:00Z",
    location: "Creative States Arsenal, Kyiv"
  }
];

const MOCK_ATTENDEES = [
  { user_id: 101, username: "alex_sol", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex", created_at: "2026-06-11T12:05:00Z" },
  { user_id: 102, username: "crypto_ninja", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ninja", created_at: "2026-06-11T12:12:00Z" },
  { user_id: 103, username: "vitalik_fan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=vitalik", created_at: "2026-06-11T12:15:00Z" },
  { user_id: 104, username: "web3_builder", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=builder", created_at: "2026-06-11T12:20:00Z" },
  { user_id: 105, username: "next_pioneer", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pioneer", created_at: "2026-06-11T12:22:00Z" },
  { user_id: 106, username: "solana_whale", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=whale", created_at: "2026-06-11T12:30:00Z" },
  { user_id: 107, username: "denys_dev", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=denys", created_at: "2026-06-11T12:35:00Z" },
  { user_id: 108, username: "mary_crypto", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mary", created_at: "2026-06-11T12:40:00Z" },
  { user_id: 109, username: "sergiy_web3", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sergiy", created_at: "2026-06-11T12:45:00Z" },
  { user_id: 110, username: "hacker_guy", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hacker", created_at: "2026-06-11T12:50:00Z" },
];

const MOCK_TOP_USERS = [
  { user_id: 103, username: "vitalik_fan", wallet_address: "HN7cWZ4S4yYn6FT...aF4E", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=vitalik", total_taps: 42, total_reputation: 630 },
  { user_id: 101, username: "alex_sol", wallet_address: "5W34s5T3yYn6FT...bF3X", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex", total_taps: 38, total_reputation: 570 },
  { user_id: 108, username: "mary_crypto", wallet_address: "8G43wZ4S4yYn...cF3Z", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mary", total_taps: 31, total_reputation: 465 },
  { user_id: 105, username: "next_pioneer", wallet_address: "2X56wZ4S4yYn...dF9Y", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pioneer", total_taps: 27, total_reputation: 405 },
  { user_id: 102, username: "crypto_ninja", wallet_address: "3Y78wZ4S4yYn...eF7Z", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ninja", total_taps: 24, total_reputation: 360 },
  { user_id: 110, username: "hacker_guy", wallet_address: "4Z89wZ4S4yYn...fF6Z", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hacker", total_taps: 19, total_reputation: 285 },
  { user_id: 111, username: "sol_maxi", wallet_address: "2B89wZ4S4yYn...gF6X", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maxi", total_taps: 17, total_reputation: 255 },
  { user_id: 112, username: "alice_w3", wallet_address: "3C89wZ4S4yYn...hF6Y", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice", total_taps: 15, total_reputation: 225 },
  { user_id: 113, username: "bob_builder", wallet_address: "4D89wZ4S4yYn...iF6Z", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob", total_taps: 14, total_reputation: 210 },
  { user_id: 114, username: "charlie_dev", wallet_address: "5E89wZ4S4yYn...jF6A", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie", total_taps: 12, total_reputation: 180 },
  { user_id: 115, username: "dave_nft", wallet_address: "6F89wZ4S4yYn...kF6B", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dave", total_taps: 10, total_reputation: 150 },
  { user_id: 116, username: "eve_solana", wallet_address: "7G89wZ4S4yYn...lF6C", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eve", total_taps: 8, total_reputation: 120 },
  { user_id: 117, username: "frank_web3", wallet_address: "8H89wZ4S4yYn...mF6D", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=frank", total_taps: 7, total_reputation: 105 },
  { user_id: 118, username: "grace_ninja", wallet_address: "9I89wZ4S4yYn...nF6E", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=grace", total_taps: 5, total_reputation: 75 },
];

function getSeededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomNormal(seed1: number, seed2: number): number {
  const u1 = getSeededRandom(seed1) || 0.0001; // Avoid 0
  const u2 = getSeededRandom(seed2);
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

const MOCK_EVENT_START = "2026-06-11T09:00:00Z";

function generateMockTaps(postId: number, center: { lat: number; lng: number }): EventTap[] {
  const taps: EventTap[] = [];
  const users = [
    { user_id: 101, username: "alex_sol", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex" },
    { user_id: 102, username: "crypto_ninja", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ninja" },
    { user_id: 103, username: "vitalik_fan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=vitalik" },
    { user_id: 104, username: "web3_builder", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=builder" },
    { user_id: 105, username: "next_pioneer", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pioneer" },
    { user_id: 106, username: "solana_whale", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=whale" },
    { user_id: 107, username: "denys_dev", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=denys" },
    { user_id: 108, username: "mary_crypto", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mary" },
    { user_id: 109, username: "sergiy_web3", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sergiy" },
    { user_id: 110, username: "hacker_guy", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hacker" },
  ];

  // We define 5 centers of density (clusters) with varying spreads, counts, and check-in vs networking ratios:
  const clusters = [
    // Lounge/Bar (Extremely Hot, 90% networking)
    { lat: center.lat - 0.00010, lng: center.lng + 0.00015, count: 65, spread: 0.00005, typeRatio: 0.9 },
    // Entrance / Registration (Hot Center, 90% checkins)
    { lat: center.lat + 0.00015, lng: center.lng - 0.00015, count: 35, spread: 0.00003, typeRatio: 0.1 },
    // Main Stage (Medium Center, 75% networking)
    { lat: center.lat + 0.00022, lng: center.lng + 0.00005, count: 45, spread: 0.00008, typeRatio: 0.75 },
    // Food & Drinks area (Small Cozy Cluster, 80% networking)
    { lat: center.lat - 0.00018, lng: center.lng - 0.00010, count: 25, spread: 0.00004, typeRatio: 0.8 },
    // General scattered interactions (Background noise)
    { lat: center.lat, lng: center.lng, count: 20, spread: 0.00028, typeRatio: 0.5 }
  ];

  let tapIndex = 0;
  clusters.forEach((cluster) => {
    for (let c = 0; c < cluster.count; c++) {
      const seedBase = postId + tapIndex * 47;
      const seedType = seedBase + 5;
      
      const type = getSeededRandom(seedType) < cluster.typeRatio ? "networking" : "checkin";
      const user = users[tapIndex % users.length];
      const given_by = users[(tapIndex + 3) % users.length];
      
      // Use Box-Muller transform for organic Gaussian distribution clustering
      const latOffset = randomNormal(seedBase + 1, seedBase + 2) * cluster.spread;
      const lngOffset = randomNormal(seedBase + 3, seedBase + 4) * cluster.spread;
      
      // Spread over a two-day event: 10:00–20:00 on day 1 and day 2
      const day = getSeededRandom(seedBase + 6) < 0.6 ? 0 : 1;
      const minutes = Math.floor(getSeededRandom(seedBase + 7) * 600);
      const createdAt = Date.parse(MOCK_EVENT_START) + (day * 24 * 60 + minutes) * 60 * 1000;

      taps.push({
        lat: cluster.lat + latOffset,
        lng: cluster.lng + lngOffset,
        type: type as "checkin" | "networking",
        user,
        given_by,
        points: type === "checkin" ? 10 : 15,
        points_given_by: type === "checkin" ? 0 : 15,
        created_at: new Date(createdAt).toISOString(),
      });
      tapIndex++;
    }
  });

  return taps;
}

function generateMockSocialGraph(postId: number): SocialGraphData {
  const nodes = [
    { id: 101, label: "alex_sol", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex", connections_count: 8, reputation_earned: 120, is_super_connector: true, is_organizer: true },
    { id: 102, label: "crypto_ninja", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ninja", connections_count: 5, reputation_earned: 75, is_super_connector: false },
    { id: 103, label: "vitalik_fan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=vitalik", connections_count: 9, reputation_earned: 135, is_super_connector: true },
    { id: 104, label: "web3_builder", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=builder", connections_count: 4, reputation_earned: 60, is_super_connector: false },
    { id: 105, label: "next_pioneer", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pioneer", connections_count: 6, reputation_earned: 90, is_super_connector: false },
    { id: 106, label: "solana_whale", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=whale", connections_count: 3, reputation_earned: 45, is_super_connector: false },
    { id: 107, label: "denys_dev", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=denys", connections_count: 4, reputation_earned: 60, is_super_connector: false },
    { id: 108, label: "mary_crypto", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mary", connections_count: 7, reputation_earned: 105, is_super_connector: true },
    { id: 109, label: "sergiy_web3", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sergiy", connections_count: 3, reputation_earned: 45, is_super_connector: false },
    { id: 110, label: "hacker_guy", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hacker", connections_count: 5, reputation_earned: 75, is_super_connector: false },
  ];

  const edges = [
    { source: 101, target: 102, weight: 3 },
    { source: 101, target: 103, weight: 4 },
    { source: 101, target: 104, weight: 2 },
    { source: 101, target: 105, weight: 2 },
    { source: 103, target: 105, weight: 3 },
    { source: 103, target: 106, weight: 2 },
    { source: 103, target: 108, weight: 5 },
    { source: 108, target: 109, weight: 2 },
    { source: 108, target: 110, weight: 4 },
    { source: 102, target: 107, weight: 2 },
    { source: 104, target: 107, weight: 1 },
    { source: 105, target: 110, weight: 3 },
    { source: 106, target: 102, weight: 1 },
    { source: 109, target: 110, weight: 2 },
    { source: 107, target: 108, weight: 3 },
  ];

  return { nodes, edges };
}

// ─── Existing Endpoints (unchanged) ─────────────────────────────────────────

// Get User's Hosted Events
export const getHostedEvents = async (userId?: number) => {
  if (isDemoModeActive()) {
    return { data: MOCK_EVENTS };
  }

  const token = storage.getItem("access");
  const currentUserId = storage.getItem("id");

  if (!token) {
    throw new Error("No access token found");
  }

  const targetId = userId || currentUserId;
  if (!targetId) {
    throw new Error("No user ID found");
  }

  const response = await axios.get(`${getApiUrl()}/posts/posts-menu/${targetId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      is_event: true,
    },
  });

  return response.data;
};

// Get Event Requests
export const getEventRequests = async () => {
  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.get(`${getApiUrl()}/posts/event-requests/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Accept or Reject an Event Request
export const actOnEventRequest = async (requestId: number, action: "approve" | "reject") => {
  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.post(
    `${getApiUrl()}/posts/event-requests/action/${requestId}/`,
    { action },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

// Get Attendees for a Specific Event
export const getEventAttendees = async (postId: number) => {
  if (isDemoModeActive()) {
    return { attendees: MOCK_ATTENDEES };
  }

  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.get(`${getApiUrl()}/posts/event-requests/attendees/${postId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get Top Users (Leaderboard) for an Event
export const getEventTopUsers = async (postId: number): Promise<TopUser[]> => {
  if (isDemoModeActive()) {
    return MOCK_TOP_USERS;
  }

  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.get(`${getApiUrl()}/posts/event-top-users/${postId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get Event Analytics
export const getEventAnalytics = async (postId: number): Promise<EventAnalyticsData> => {
  if (isDemoModeActive()) {
    if (postId === 9992) {
      return {
        total_requests: 650,
        accepted_requests: 480,
        rejected_requests: 70,
        nfc_checkins: 390,
        total_irl_taps: 1840,
        total_reputation_earned: 64800,
        cnft_claims_count: 340,
        cnft_claim_rate: 87,
        ecosystem_stats: {
          total_users: 480,
          mwa_wallet_users: 360,
          web2_users: 120,
          mwa_percentage: 75,
          web2_percentage: 25,
        },
        hourly_activity: [
          { hour: "2026-06-10T14:00:00Z", checkins: 120, networking: 10, total: 130 },
          { hour: "2026-06-10T15:00:00Z", checkins: 150, networking: 40, total: 190 },
          { hour: "2026-06-10T16:00:00Z", checkins: 80, networking: 120, total: 200 },
          { hour: "2026-06-10T17:00:00Z", checkins: 30, networking: 280, total: 310 },
          { hour: "2026-06-10T18:00:00Z", checkins: 10, networking: 420, total: 430 },
          { hour: "2026-06-10T19:00:00Z", checkins: 0, networking: 340, total: 340 },
        ],
      };
    }

    if (postId === 9993) {
      return {
        total_requests: 320,
        accepted_requests: 240,
        rejected_requests: 30,
        nfc_checkins: 210,
        total_irl_taps: 950,
        total_reputation_earned: 31200,
        cnft_claims_count: 195,
        cnft_claim_rate: 93,
        ecosystem_stats: {
          total_users: 240,
          mwa_wallet_users: 144,
          web2_users: 96,
          mwa_percentage: 60,
          web2_percentage: 40,
        },
        hourly_activity: [
          { hour: "2026-06-09T18:00:00Z", checkins: 90, networking: 5, total: 95 },
          { hour: "2026-06-09T19:00:00Z", checkins: 80, networking: 35, total: 115 },
          { hour: "2026-06-09T20:00:00Z", checkins: 30, networking: 110, total: 140 },
          { hour: "2026-06-09T21:00:00Z", checkins: 10, networking: 220, total: 230 },
          { hour: "2026-06-09T22:00:00Z", checkins: 0, networking: 210, total: 210 },
          { hour: "2026-06-09T23:00:00Z", checkins: 0, networking: 160, total: 160 },
        ],
      };
    }

    // Default to Event 1 (9991)
    return {
      total_requests: 1284,
      accepted_requests: 942,
      rejected_requests: 182,
      nfc_checkins: 720,
      total_irl_taps: 3420,
      total_reputation_earned: 128500,
      cnft_claims_count: 662,
      cnft_claim_rate: 92,
      ecosystem_stats: {
        total_users: 942,
        mwa_wallet_users: 640,
        web2_users: 302,
        mwa_percentage: 68,
        web2_percentage: 32,
      },
      hourly_activity: [
        { hour: "2026-06-11T20:00:00Z", checkins: 180, networking: 20, total: 200 },
        { hour: "2026-06-11T21:00:00Z", checkins: 320, networking: 90, total: 410 },
        { hour: "2026-06-11T22:00:00Z", checkins: 120, networking: 480, total: 600 },
        { hour: "2026-06-11T23:00:00Z", checkins: 60, networking: 820, total: 880 },
        { hour: "2026-06-12T00:00:00Z", checkins: 30, networking: 980, total: 1010 },
        { hour: "2026-06-12T01:00:00Z", checkins: 10, networking: 670, total: 680 },
      ],
    };
  }

  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.get(`${getApiUrl()}/posts/event-analytics/${postId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get Event Social Graph
export const getEventSocialGraph = async (postId: number): Promise<SocialGraphData> => {
  if (isDemoModeActive()) {
    return generateMockSocialGraph(postId);
  }

  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.get(`${getApiUrl()}/posts/event-social-graph/${postId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Send Event Broadcast
export const sendEventBroadcast = async (postId: number, message: string): Promise<BroadcastResult> => {
  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.post(
    `${getApiUrl()}/posts/event-broadcast/${postId}/`,
    { message },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

// ─── Event Update and Delete Endpoints ───────────────────────────────────────

export interface UpdateEventPayload {
  about?: string;
  location?: string;
  coords?: { lat: number; lng: number };
  resolution?: number;
  luma_event_start_time?: string;
  luma_event_end_time?: string;
  total_supply?: number;
}

export interface UpdateEventResult {
  success: boolean;
  id: number;
  about: string;
  location: string;
  h3_geo: string;
  luma_event_url: string;
  luma_event_start_time: string;
  luma_event_end_time: string;
  total_supply: number;
  minted_count: number;
}

export async function updateEventPost(postId: number, payload: UpdateEventPayload): Promise<UpdateEventResult> {
  const token = storage.getItem("access");
  if (!token) throw new Error("No access token found");

  const response = await axios.patch(
    `${getApiUrl()}/posts/event-update/${postId}/`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

export async function deleteEventPost(postId: number): Promise<{ data: string }> {
  const token = storage.getItem("access");
  if (!token) throw new Error("No access token found");

  const response = await axios.delete(
    `${getApiUrl()}/posts/delete-post/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        postId,
      },
    }
  );
  return response.data;
}

// ─── Event Taps Coordinates (Heatmap) Endpoint ───────────────────────────────

export interface EventTapUser {
  user_id: number;
  username: string;
  avatar: string | null;
}

export interface EventTap {
  lat: number;
  lng: number;
  type: "checkin" | "networking";
  user?: EventTapUser;
  given_by?: EventTapUser;
  points?: number;
  points_given_by?: number;
  /** ISO time of the check-in / when the pair met (older backends omit it) */
  created_at?: string | null;
}

export interface EventTapsResult {
  event_id: number;
  title: string;
  center: { lat: number; lng: number } | null;
  /** Event H3 cell; the check-in zone is gridDisk(h3_geo, zone_rings) */
  h3_geo?: string | null;
  zone_rings?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  /** IANA zone of the event venue, e.g. "Asia/Bangkok" */
  timezone?: string | null;
  taps: EventTap[];
}

export async function getEventTaps(postId: number): Promise<EventTapsResult> {
  if (isDemoModeActive()) {
    let center = { lat: 38.7369, lng: -9.1128 }; // Convento do Beato, Lisbon
    let title = "Solana Breakpoint VIP Afterparty";

    if (postId === 9992) {
      center = { lat: 50.4687, lng: 30.4623 }; // UNIT.City, Kyiv
      title = "NextVibe Founders Summit";
    } else if (postId === 9993) {
      center = { lat: 50.4398, lng: 30.5457 }; // Creative States Arsenal, Kyiv
      title = "Kyiv Web3 Hackathon Night";
    }

    return {
      event_id: postId,
      title,
      center,
      h3_geo: latLngToCell(center.lat, center.lng, 11),
      zone_rings: 2,
      start_time: MOCK_EVENT_START,
      end_time: new Date(Date.parse(MOCK_EVENT_START) + 30 * 3600 * 1000).toISOString(),
      timezone: "Europe/Lisbon",
      taps: generateMockTaps(postId, center),
    };
  }

  const token = storage.getItem("access");
  if (!token) throw new Error("No access token found");

  const response = await axios.get(
    `${getApiUrl()}/posts/event-taps/${postId}/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

// ─── Event Posts (posts made at an event by attendees) ────────────────────────

export interface EventPostMedia {
  id: number;
  media_url: string | null;
  media_preview: string | null;
  type: "image" | "video";
}

export interface EventPost {
  id: number;
  about: string;
  create_at: string;
  location: string | null;
  count_likes: number;
  is_comments_enabled: boolean;
  owner__user_id: number;
  owner__username: string;
  owner__avatar: string | null;
  owner__official: boolean;
  media: EventPostMedia[];
  is_ai_generated: boolean;
  moderation_status: string;
  is_nft: boolean;
  minted_count: number;
  total_supply: number;
  nft_price: string | null;
  already_claimed: boolean;
  sold_out: boolean;
  is_owner: boolean;
  owner_wallet: string | null;
  owner__is_og: boolean;
  owner__edition: number | null;
  owner__invited_count: number;
  is_luma_event: boolean;
  luma_event_url: string | null;
  luma_event_verified: boolean;
  luma_event_start_time: string | null;
  luma_event_end_time: string | null;
  event_request_status: string | null;
  on_event: number | null;
  reputation_earned: number;
}

export interface EventPostsResponse {
  results: EventPost[];
  count: number;
  total: number;
  more_posts: boolean;
  liked_posts: number[];
}

export async function getEventPosts(
  postId: number,
  index: number = 0,
  limit: number = 50
): Promise<EventPostsResponse> {
  const token = storage.getItem("access");

  if (!token) {
    throw new Error("No access token found");
  }

  const response = await axios.get(
    `${getApiUrl()}/posts/event-posts/${postId}/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { index, limit },
    }
  );

  return response.data;
}
