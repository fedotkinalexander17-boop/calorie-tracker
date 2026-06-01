import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ProStatus =
  | { state: "loading" }
  | { state: "free" }
  | { state: "active"; daysLeft: number; expiresAt: string }
  | { state: "expired" }
  | { state: "revoked" };

const LS_KEY = "pro_token";

interface ProContextValue {
  status: ProStatus;
  token: string | null;
  applyToken: (token: string) => void;
  clearToken: () => void;
}

const ProContext = createContext<ProContextValue>({
  status: { state: "loading" },
  token: null,
  applyToken: () => {},
  clearToken: () => {},
});

export function ProAccessProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ProStatus>({ state: "loading" });

  const validate = async (t: string) => {
    setStatus({ state: "loading" });
    try {
      const res = await fetch(`/api/tokens/${encodeURIComponent(t)}/validate`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.valid) {
        setStatus({ state: "active", daysLeft: data.daysLeft, expiresAt: data.expiresAt });
        localStorage.setItem(LS_KEY, t);
        setToken(t);
      } else if (data.reason === "expired") {
        // Keep token in localStorage so user always sees "expired / renew" — not "get access"
        setStatus({ state: "expired" });
        setToken(t);
      } else if (data.reason === "revoked") {
        setStatus({ state: "revoked" });
        localStorage.removeItem(LS_KEY);
        setToken(null);
      } else {
        setStatus({ state: "free" });
      }
    } catch {
      setStatus({ state: "free" });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      if (urlToken.length >= 8) {
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
        validate(urlToken);
        return;
      }
    }

    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      validate(stored);
    } else {
      setStatus({ state: "free" });
    }
  }, []);

  const applyToken = (t: string) => validate(t);

  const clearToken = () => {
    localStorage.removeItem(LS_KEY);
    setToken(null);
    setStatus({ state: "free" });
  };

  return (
    <ProContext.Provider value={{ status, token, applyToken, clearToken }}>
      {children}
    </ProContext.Provider>
  );
}

export function useProAccess() {
  return useContext(ProContext);
}

export function isPro(status: ProStatus) {
  return status.state === "active";
}
