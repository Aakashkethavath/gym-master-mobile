import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { authApi, User } from '@/api';
import { storage } from '@/utils/storage';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; contact?: string; city?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState & AuthActions | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);

  // Bootstrap: read persisted user and tokens from secure storage.
  useEffect(() => {
    (async () => {
      try {
        const [storedUser, accessToken, refreshToken] = await Promise.all([
          storage.getUser(),
          storage.getAccessToken(),
          storage.getRefreshToken(),
        ]);

        if (storedUser && accessToken) {
          setUserState(storedUser);
          refreshTokenRef.current = refreshToken;
        }
      } catch {
        // If storage read fails, start unauthenticated — not a crash.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const { user: u, accessToken, refreshToken } = data;
    await storage.setTokens(accessToken, refreshToken);
    await storage.setUser(u);
    refreshTokenRef.current = refreshToken;
    setUserState(u);

    // Route to the right dashboard.
    router.replace(u.role === 'admin' ? '/(admin)/dashboard' : '/(client)/home');
  }, []);

  const register = useCallback(async (data: Parameters<typeof authApi.register>[0]) => {
    const { data: res } = await authApi.register(data);
    const { user: u, accessToken, refreshToken } = res;
    await storage.setTokens(accessToken, refreshToken);
    await storage.setUser(u);
    refreshTokenRef.current = refreshToken;
    setUserState(u);
    router.replace('/(client)/home');
  }, []);

  const logout = useCallback(async () => {
    try {
      if (refreshTokenRef.current) {
        await authApi.logout(refreshTokenRef.current);
      }
    } catch {
      // best-effort — even if the server call fails, clear locally.
    }
    await storage.clear();
    refreshTokenRef.current = null;
    setUserState(null);
    router.replace('/(auth)/login');
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.me();
    setUserState(data.user);
    await storage.setUser(data.user);
  }, []);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    storage.setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState & AuthActions {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
