/** Web-compatible storage for auth tokens (mirrors mobile SecureStore/AsyncStorage).
 *  Uses localStorage on the client. All methods are sync-compatible but
 *  kept async to match the mobile API surface. */

const PREFIX = "nextvibe_";

export const storage = {
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PREFIX}${key}`, value);
  },

  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`${PREFIX}${key}`);
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${PREFIX}${key}`);
  },

  clearAll: (): void => {
    if (typeof window === "undefined") return;
    const keys = ["access", "refresh", "id", "wallet"];
    keys.forEach((k) => localStorage.removeItem(`${PREFIX}${k}`));
  },
};
