"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queryClientInstance";
import { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { StellarNetworkProvider } from "./StellarNetworkContext";
import { PlaybackProvider } from "./PlaybackContext";
import { ThemeProvider } from "./ThemeContext";
import PrivyProvider from "./PrivyProvider";
import { CurrencyPreferenceProvider } from "./CurrencyPreferenceContext";
import { I18nProvider } from "./I18nContext";
import { SongProcessingProvider } from "./SongProcessingContext";

const Provider = ({ children }: { children: ReactNode }) => {
  return (
    <PrivyProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <CurrencyPreferenceProvider>
              <StellarNetworkProvider>
                <MotionConfig reducedMotion="user">
                  <PlaybackProvider>
                    <SongProcessingProvider>{children}</SongProcessingProvider>
                  </PlaybackProvider>
                </MotionConfig>
              </StellarNetworkProvider>
            </CurrencyPreferenceProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
};

export default Provider;
