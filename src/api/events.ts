import axios from "axios";
import { storage } from "../utils/storage";
import getApiUrl from "../utils/url_api";

// 1. Get User's Hosted Events
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

// 2. Get Event Requests
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

// 3. Accept or Reject an Event Request
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

// 4. Get Attendees for a Specific Event
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

// 5. Get Event Analytics
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
