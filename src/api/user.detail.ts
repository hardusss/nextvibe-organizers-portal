import axios from "axios";
import { storage } from "../utils/storage";
import getApiUrl from "../utils/url_api";

export const getUserDetail = async (id?: number, isProfile?: boolean) => {
  const token = storage.getItem("access");
  const userId = storage.getItem("id");

  if (!token) {
    throw new Error("No access token found");
  }

  const targetId = id || userId;
  if (!targetId) {
    throw new Error("No user ID found");
  }

  const response = await axios.get(`${getApiUrl()}/users/user-detail/${targetId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      isProfile: isProfile ? isProfile : false,
    },
  });

  return response.data;
};
