"use client";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { liskSepolia, mainnet, sepolia } from "viem/chains";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ReactNode } from "react";
import { SdkViewSectionType, SdkViewType } from "@dynamic-labs/sdk-api";

const config = createConfig({
	chains: [mainnet, sepolia, liskSepolia],
	multiInjectedProviderDiscovery: false,
	transports: {
		[mainnet.id]: http(),
		[liskSepolia.id]: http(),
		[sepolia.id]: http(),
	},
});

// Create QueryClient outside component to prevent recreation on every render
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: (failureCount, error: any) => {
				// Don't retry on 4xx errors
				if (error?.status >= 400 && error?.status < 500) {
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

const Provider = ({ children }: { children: ReactNode }) => {
	return (
		<DynamicContextProvider
			settings={{
				environmentId: "c686da1e-ac86-4bd4-a2f4-5fe6ff42ed85",
				walletConnectors: [EthereumWalletConnectors],
				overrides: {
					views: [
						{
							type: SdkViewType.Login,
							sections: [
								{
									type: SdkViewSectionType.Email,
								},
								{
									type: SdkViewSectionType.Separator,
									label: "Or",
								},
								{
									type: SdkViewSectionType.Social,
									defaultItem: "google",
								},
							],
						},
					],
				},
			}}
		>
			<WagmiProvider config={config}>
				<QueryClientProvider client={queryClient}>
					<DynamicWagmiConnector>{children}</DynamicWagmiConnector>
				</QueryClientProvider>
			</WagmiProvider>
		</DynamicContextProvider>
	);
};

export default Provider;
