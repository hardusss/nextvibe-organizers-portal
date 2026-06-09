"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { storage } from "@/src/utils/storage";

interface AuthState {
  /** Logged-in user's ID (null when not authenticated). */
  userId: string | null;
  /** Whether the user has valid tokens in storage. */
  isAuthenticated: boolean;
  /** Store auth data after successful login. */
  setAuth: (userId: string) => void;
  /** Clear all auth data and redirect to login. */
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  userId: null,
  isAuthenticated: false,
  setAuth: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    const storedId = storage.getItem("id");
    const storedAccess = storage.getItem("access");
    if (storedId && storedAccess) {
      setUserId(storedId);
    }
  }, []);

  const setAuth = useCallback((id: string) => {
    setUserId(id);
  }, []);

  const logout = useCallback(() => {
    storage.clearAll();
    setUserId(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userId,
        isAuthenticated: !!userId,
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
