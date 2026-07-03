"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { storage } from "@/src/utils/storage";

interface AuthState {
  userId: string | null;
  isAuthenticated: boolean;
  setAuth: (userId: string) => void;
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
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  /* Hydrate from localStorage on mount and protect routes */
  useEffect(() => {
    const storedId = storage.getItem("id");
    const storedAccess = storage.getItem("access");
    const hasToken = !!storedAccess;
    
    if (storedId && storedAccess) {
      setUserId(storedId);
    }
    setIsHydrated(true);

    const isAuthRoute = pathname === "/login" || pathname === "/login/";

    if (!hasToken && !isAuthRoute) {
      router.replace("/login");
    } else if (hasToken && isAuthRoute) {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

  const setAuth = useCallback((id: string) => {
    setUserId(id);
    router.replace("/dashboard");
  }, [router]);

  const logout = useCallback(() => {
    storage.clearAll();
    setUserId(null);
    router.replace("/login");
  }, [router]);

  if (!isHydrated) {
    return null;
  }

  const isAuthRoute = pathname === "/login" || pathname === "/login/";
  if (!userId && !isAuthRoute) {
    return null;
  }

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
