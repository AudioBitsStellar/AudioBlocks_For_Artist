"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { StellarNetworkProvider } from "./StellarNetworkContext";
import { I18nProvider } from "./I18nContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: Error) => {
        const httpError = error as { status?: number };
        if (httpError?.status >= 400 && httpError?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false;

  const savedTheme = window.localStorage.getItem("theme");
  if (savedTheme === "dark") return true;
  if (savedTheme === "light") return false;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function applyTheme(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.dataset.theme = isDark ? "dark" : "light";

  const variables = isDark
    ? {
        "--background": "#111111",
        "--surface": "#171717",
        "--surface-raised": "#222222",
        "--border": "#3f3f46",
        "--border-subtle": "#27272a",
        "--text": "#f4f4f5",
        "--text-muted": "#a1a1aa",
        "--text-subtle": "#71717a",
        "--text-inverted": "#ffffff",
        "--secondary": "#27272a",
        "--primary": "#d2045b",
      }
    : {
        "--background": "#ffffff",
        "--surface": "#ffffff",
        "--surface-raised": "#f4f4f5",
        "--border": "#d4d4d8",
        "--border-subtle": "#e4e4e7",
        "--text": "#18181b",
        "--text-muted": "#52525b",
        "--text-subtle": "#71717a",
        "--text-inverted": "#ffffff",
        "--secondary": "#52525b",
        "--primary": "#b0004b",
      };

  Object.entries(variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

const Provider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(isDark);
    window.localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <StellarNetworkProvider>{children}</StellarNetworkProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

export { applyTheme, getInitialTheme };
export default Provider;
