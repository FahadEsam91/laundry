import { createContext, useCallback, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { api, setToken, setUnauthorizedHandler } from "./api";
import { secure } from "./storage";

type Ctx = {
  ready: boolean;
  token: string | null;
  me: any;
  refreshMe: () => void;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthC = createContext<Ctx | null>(null);
export const useAuth = () => useContext(AuthC)!;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(null);
  const { data: me, mutate } = useSWR(token ? "/api/me" : null, { refreshInterval: 30000 });

  const signOut = useCallback(async () => {
    await secure.del("token");
    setToken(null);
    setTok(null);
  }, []);

  useEffect(() => {
    secure.get("token").then((t) => {
      setToken(t);
      setTok(t);
      setReady(true);
    });
    setUnauthorizedHandler(() => signOut());
  }, [signOut]);

  const signIn = async (t: string) => {
    await secure.set("token", t);
    setToken(t);
    setTok(t);
  };

  return <AuthC.Provider value={{ ready, token, me, refreshMe: () => mutate(), signIn, signOut }}>{children}</AuthC.Provider>;
}

export async function deleteAccount() {
  await api("/api/me", { method: "DELETE" });
}
