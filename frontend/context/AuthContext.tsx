"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";

type User = {
  email: string;
};

type AuthContextType = {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const localToken = localStorage.getItem("token");
    const cookieToken = Cookies.get("token");
    const token = localToken || cookieToken;

    if (token) {
      if (!localToken) {
        localStorage.setItem("token", token);
      }
      if (!cookieToken) {
        Cookies.set("token", token);
      }

      // ⚠️ For now we just simulate user
      setUser({ email: "user@example.com" });
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem("token", token);
    Cookies.set("token", token);
    setUser({ email: "user@example.com" });
  };

  const logout = () => {
    localStorage.removeItem("token");
    Cookies.remove("token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
