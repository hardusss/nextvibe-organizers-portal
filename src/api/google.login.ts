import axios from "axios";
import getApiUrl from "../utils/url_api";
import { storage } from "../utils/storage";

/** POST /users/google-login/ — login an existing Google user.
 *  Mirrors the mobile app's GoogleLogin function. */
export interface GoogleSignInParams {
  username: string;
  email: string;
  avatar_url: string;
  idToken: string;
  inviteCode?: string;
}

export default async function googleLogin(
  params: GoogleSignInParams
): Promise<{ user_id: number; token: { access: string; refresh: string } }> {
  const payload: any = {
    username: params.username,
    email: params.email,
    avatar_url: params.avatar_url,
    idToken: params.idToken,
  };

  if (params.inviteCode) {
    payload.from_invite_code = params.inviteCode;
  }

  const { data } = await axios.post(
    `${getApiUrl()}/users/google-sign-in/`,
    payload
  );

  if (data?.token) {
    storage.setItem("id", `${data.user_id}`);
    storage.setItem("access", data.token.access);
    storage.setItem("refresh", data.token.refresh);
  }

  return data;
}
