"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import { ReactNode } from "react";

interface PrivyProviderProps {
  children: ReactNode;
}

export default function PrivyProvider({ children }: PrivyProviderProps) {
  return (
    <Privy
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
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
