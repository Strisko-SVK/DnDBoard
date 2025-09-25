"use client";
import { create } from 'zustand';

interface AuthState {
  token?: string;
  user?: any;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: undefined,
  user: undefined,
  setAuth: (token, user) => set({ token, user }),
  logout: () => set({ token: undefined, user: undefined })
}));

