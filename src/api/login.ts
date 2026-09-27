import axios from "axios";
import getApiUrl from "../utils/url_api";
import { storage } from "../utils/storage";

export type LoginResult =
  | { user_id: number }
  /** The account has to confirm its email first: a code was sent to it. */
  | { verificationRequired: true; email: string; resendIn: number; sendError?: string };

function saveSession(data: { user_id: number; token: { access: string; refresh: string } }) {
  storage.setItem("id", `${data.user_id}`);
  storage.setItem("access", data.token.access);
  storage.setItem("refresh", data.token.refresh);
}

/** POST /users/login/ — email + password login.
 *  Mirrors the mobile app's Login function. */
export default async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const { data } = await axios.post(`${getApiUrl()}/users/login/`, { email, password });
    saveSession(data);
    return { user_id: data.user_id };
  } catch (err) {
    const data = axios.isAxiosError(err) ? err.response?.data : undefined;
    if (axios.isAxiosError(err) && err.response?.status === 403 && data?.code === "EMAIL_NOT_VERIFIED") {
      return {
        verificationRequired: true,
        email: data.email ?? email,
        resendIn: Number(data.resendIn) || 60,
        sendError: data.sendError,
      };
    }
    throw err;
  }
}

/** The API's answer body of a failed call, if any. */
export function errorBody(err: unknown): { error?: string; retryIn?: number } | undefined {
  return axios.isAxiosError(err) ? err.response?.data : undefined;
}

/** POST /users/email/verify/ — the code from the email finishes the sign-in. */
export async function verifyEmail(email: string, password: string, code: string): Promise<{ user_id: number }> {
  const { data } = await axios.post(`${getApiUrl()}/users/email/verify/`, { email, password, code });
  saveSession(data);
  return { user_id: data.user_id };
}

/** POST /users/email/send-code/ — a new code; answers how long until the next one. */
export async function sendEmailCode(email: string, password: string): Promise<number> {
  const { data } = await axios.post(`${getApiUrl()}/users/email/send-code/`, { email, password });
  return Number(data?.resendIn) || 60;
}
