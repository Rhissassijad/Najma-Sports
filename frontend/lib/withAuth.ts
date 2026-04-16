"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

type UseAuthGuardResult = {
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
};

export function useAuthGuard(redirectTo = "/"): UseAuthGuardResult {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const localToken = localStorage.getItem("token");
    const cookieToken = Cookies.get("token");
    const token = localToken || cookieToken;

    if (!token) {
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      router.replace(redirectTo);
      return;
    }

    if (!localToken) {
      localStorage.setItem("token", token);
    }
    if (!cookieToken) {
      Cookies.set("token", token);
    }

    setIsAuthenticated(true);
    setIsCheckingAuth(false);
  }, [redirectTo, router]);

  return { isAuthenticated, isCheckingAuth };
}
