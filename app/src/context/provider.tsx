"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queryClientInstance";
import { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { StellarNetworkProvider } from "./StellarNetworkContext";
import { PlaybackProvider } from "./PlaybackContext";
import { ThemeProvider } from "./ThemeContext";
import { CurrencyPreferenceProvider } from "./CurrencyPreferenceContext";

const Provider = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CurrencyPreferenceProvider>
          <StellarNetworkProvider>
            <MotionConfig reducedMotion="user">
              <PlaybackProvider>{children}</PlaybackProvider>
            </MotionConfig>
          </StellarNetworkProvider>
        </CurrencyPreferenceProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Provider;
