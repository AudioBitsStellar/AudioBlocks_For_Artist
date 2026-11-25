"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import { ReactNode } from "react";
import { getRuntimeConfig } from "@/lib/runtimeConfig";

interface PrivyProviderProps {
  children: ReactNode;
}

export default function PrivyProvider({ children }: PrivyProviderProps) {
  return (
    <Privy
      appId={getRuntimeConfig().privyAppId}
      config={{
        loginMethods: ["email", "wallet", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#D2045B",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      {children}
    </Privy>
  );
}
