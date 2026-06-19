"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, type ApiClient } from "@/lib/api-client";
import { createStandaloneClient } from "@/lib/standalone/client";
import { isStandaloneMode } from "@/lib/standalone/config";

const ApiContext = createContext<ApiClient | null>(null);

function makeDevClient(): ApiClient {
  return {
    fetch: <T,>(path: string, options: RequestInit = {}) => apiFetch<T>(path, options, null),
    upload: <T,>(path: string, formData: FormData) =>
      apiFetch<T>(path, { method: "POST", body: formData }, null),
  };
}

export function StandaloneApiProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createStandaloneClient(), []);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function DevApiProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(
    () => (isStandaloneMode() ? createStandaloneClient() : makeDevClient()),
    []
  );
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function ClerkApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const client = useMemo<ApiClient>(
    () => ({
      fetch: async <T,>(path: string, options: RequestInit = {}) => {
        const token = await getToken();
        return apiFetch<T>(path, options, token);
      },
      upload: async <T,>(path: string, formData: FormData) => {
        const token = await getToken();
        return apiFetch<T>(path, { method: "POST", body: formData }, token);
      },
    }),
    [getToken]
  );
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) {
    return makeDevClient();
  }
  return client;
}
