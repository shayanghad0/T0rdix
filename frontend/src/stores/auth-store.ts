import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  patchUser: (user: User) => void;
  logout: () => void;
}

/** Auth session, persisted to localStorage so refreshes keep you signed in. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      patchUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "t0rdix-auth" },
  ),
);
