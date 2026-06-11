import axios, { AxiosError } from "axios";
import { storage } from "../utils/storage";
import getApiUrl from "../utils/url_api";

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

// ─── Existing Endpoints (unchanged) ─────────────────────────────────────────

// Get User's Hosted Events
export const getHostedEvents = async (userId?: number) => {
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
export const getEventAnalytics = async (postId: number) => {
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

export interface EventTap {
  lat: number;
  lng: number;
  type: "checkin" | "networking";
}

export interface EventTapsResult {
  event_id: number;
  title: string;
  center: { lat: number; lng: number } | null;
  taps: EventTap[];
}

export async function getEventTaps(postId: number): Promise<EventTapsResult> {
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


