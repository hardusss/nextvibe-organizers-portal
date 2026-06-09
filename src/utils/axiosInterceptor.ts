import axios from "axios";
import { storage } from "./storage";
import getApiUrl from "./url_api";

/** Whether a refresh request is currently in flight. */
let isRefreshing = false;

/** Queued callbacks waiting for the current refresh to finish. */
let refreshQueue: Array<(token: string | null) => void> = [];

function getAccess(): string | null {
  return storage.getItem("access");
}

function getRefresh(): string | null {
  return storage.getItem("refresh");
}

function saveAccess(token: string): void {
  storage.setItem("access", token);
}

async function refreshToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise<string | null>((resolve) =>
      refreshQueue.push(resolve)
    );
  }

  isRefreshing = true;

  try {
    const refresh = getRefresh();

    if (!refresh) {
      throw new Error("No refresh token");
    }

    const res = await axios.post(`${getApiUrl()}/users/token/refresh/`, {
      refresh,
    });

    const { access, refresh: newRefresh } = res.data;

    if (!access) {
      throw new Error("Refresh failed: no access token in response");
    }

    saveAccess(access);
    if (newRefresh) storage.setItem("refresh", newRefresh);

    refreshQueue.forEach((cb) => cb(access));
    refreshQueue = [];

    return access as string;
  } catch (error) {
    refreshQueue.forEach((cb) => cb(null));
    refreshQueue = [];

    /* Auth is unrecoverable — clear tokens and redirect to login */
    storage.clearAll();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    throw error;
  } finally {
    isRefreshing = false;
  }
}

/** Call once at app init to attach Bearer token & 401 refresh logic. */
export function setupAxiosInterceptor(): void {
  axios.interceptors.request.use((config) => {
    const access = getAccess();
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;

      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;

        try {
          const newAccess = await refreshToken();

          if (!newAccess) {
            return Promise.reject(error);
          }

          original.headers.Authorization = `Bearer ${newAccess}`;
          return axios(original);
        } catch (e) {
          console.error("Refresh failed after 401");
          return Promise.reject(e);
        }
      }

      return Promise.reject(error);
    }
  );
}
