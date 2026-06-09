import axios from "axios";
import getApiUrl from "../utils/url_api";
import { storage } from "../utils/storage";

interface WalletSignInPayload {
  pubkey: string;
  signature: number[];
  message: string;
  username: string;
}

interface WalletSignInResponse {
  user_id: number;
  token: {
    access: string;
    refresh: string;
  };
}

/** POST /users/wallet-sign-in/ — sign in via Solana wallet signature.
 *  Mirrors the mobile app's walletSignIn function. */
export default async function walletSignIn(
  payload: WalletSignInPayload
): Promise<WalletSignInResponse> {
  const { data } = await axios.post<WalletSignInResponse>(
    `${getApiUrl()}/users/wallet-sign-in/`,
    {
      wallet_address: payload.pubkey,
      signature: payload.signature,
      message: payload.message,
      username: payload.username,
    }
  );

  if (data?.token) {
    storage.setItem("id", `${data.user_id}`);
    storage.setItem("access", data.token.access);
    storage.setItem("refresh", data.token.refresh);
  }

  return data;
}
