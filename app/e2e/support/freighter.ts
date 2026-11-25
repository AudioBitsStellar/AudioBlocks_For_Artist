import type { Page } from "@playwright/test";

export const FREIGHTER_ADDRESS = "GBQXKZDJN5RGY33DNNZS243BNVYGYZJNMFZHI2LTOQWTAMBQGAYDAOCF";
export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

interface MockFreighterOptions {
  rejectAccess?: boolean;
  network?: "TESTNET" | "PUBLIC";
}

export async function mockFreighter(page: Page, options: MockFreighterOptions = {}) {
  const { rejectAccess = false, network = "TESTNET" } = options;
  const networkPassphrase = network === "TESTNET" ? TESTNET_PASSPHRASE : MAINNET_PASSPHRASE;

  await page.addInitScript(
    ({ address, shouldReject, networkName, passphrase }) => {
      Object.defineProperty(window, "freighter", { value: true, configurable: true });
      window.addEventListener("message", (event) => {
        if (event.source !== window || event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") {
          return;
        }

        const respond = (response: Record<string, unknown>) => {
          // Freighter posts before it starts listening for the response.
          queueMicrotask(() => {
            window.postMessage(
              {
                source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
                messagedId: event.data.messageId,
                ...response,
              },
              window.location.origin
            );
          });
        };
        const rejected = {
          publicKey: "",
          apiError: { code: -4, message: "The user rejected this request." },
        };

        switch (event.data.type) {
          case "REQUEST_CONNECTION_STATUS":
            respond({ isConnected: true });
            break;
          case "REQUEST_PUBLIC_KEY":
            respond(rejected);
            break;
          case "REQUEST_ACCESS":
            respond(shouldReject ? rejected : { publicKey: address });
            break;
          case "REQUEST_NETWORK_DETAILS":
            respond({
              networkDetails: {
                network: networkName,
                networkUrl:
                  networkName === "TESTNET"
                    ? "https://horizon-testnet.stellar.org"
                    : "https://horizon.stellar.org",
                networkPassphrase: passphrase,
              },
            });
            break;
        }
      });
    },
    {
      address: FREIGHTER_ADDRESS,
      shouldReject: rejectAccess,
      networkName: network,
      passphrase: networkPassphrase,
    }
  );
}
