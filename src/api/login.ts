import axios from "axios";
import getApiUrl from "../utils/url_api";
import { storage } from "../utils/storage";

/** POST /users/login/ — email + password login.
 *  Mirrors the mobile app's Login function. */
export default async function login(
  email: string,
  password: string
): Promise<{ user_id: number }> {
  const { data } = await axios.post(`${getApiUrl()}/users/login/`, {
    email,
    password,
  });

  storage.setItem("id", `${data.user_id}`);
  storage.setItem("access", data.token.access);
  storage.setItem("refresh", data.token.refresh);

  return { user_id: data.user_id };
}
