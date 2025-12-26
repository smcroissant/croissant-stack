"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  user: User;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const { data } = await authClient.getSession();
      setSession(data as Session | null);
    } catch (error) {
      console.error("Failed to load session:", error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      setSession(null);
      window.location.href = "/login";
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
