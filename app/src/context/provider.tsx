"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queryClientInstance";
import { ReactNode } from "react";
import { StellarNetworkProvider } from "./StellarNetworkContext";
import { PlaybackProvider } from "./PlaybackContext";
import { ThemeProvider } from "./ThemeContext";
import PrivyProvider from "./PrivyProvider";

const Provider = ({ children }: { children: ReactNode }) => {
  return (
    <PrivyProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StellarNetworkProvider>
            <PlaybackProvider>{children}</PlaybackProvider>
          </StellarNetworkProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};

export default Provider;
