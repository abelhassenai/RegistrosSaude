"use client";

import { useEffect, useState } from "react";

export interface AuthUser {
  token: string;
  nome: string;
  email: string;
  permissao: string;
  emoji?: string;
}

const AUTH_KEY = "colmeia_auth";

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// Evento disparado quando o login muda nesta aba, para que todos os
// componentes que usam o useAuth (menu e página) se atualizem juntos.
const AUTH_CHANGE_EVENT = "colmeia_auth_change";

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function saveAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
  notifyAuthChange();
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setUser(getAuthUser());
    sync();
    setLoading(false);

    // Mudanças nesta aba (evento próprio) e em outras abas (storage)
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === AUTH_KEY) sync();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function logout() {
    clearAuthUser();
    setUser(null);
  }

  return { user, loading, logout, setUser };
}
