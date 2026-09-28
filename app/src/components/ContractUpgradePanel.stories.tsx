import type { Meta, StoryObj } from "@storybook/react";
import ContractUpgradePanel from "./ContractUpgradePanel";

const VALID_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const VALID_ADMIN = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const meta: Meta<typeof ContractUpgradePanel> = {
  title: "Web3/ContractUpgradePanel",
  component: ContractUpgradePanel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Admin-only panel to upgrade a Soroban smart contract's WASM bytecode in-place. " +
          "Implements the prepare → sign (Freighter) → submit lifecycle defined in " +
          "`docs/SOROBAN_CONTRACT_UPGRADE_DESIGN.md` (#295).",
      },
    },
  },
  args: {
    contractId: VALID_CONTRACT_ID,
    adminAddress: VALID_ADMIN,
    onSign: async (xdr) => {
      // Simulated Freighter sign — returns a stub signed XDR for Storybook demos.
      await new Promise((r) => setTimeout(r, 800));
      return `signed_${xdr.slice(0, 16)}`;
    },
  },
};

export default meta;
type Story = StoryObj<typeof ContractUpgradePanel>;

/** Default idle state — panel ready for admin input. */
export const Default: Story = {};

/** Panel mounted with a pre-filled WASM hash (simulates copy-paste from the CLI). */
export const PrefilledHash: Story = {
  args: {
    contractId: VALID_CONTRACT_ID,
    adminAddress: VALID_ADMIN,
  },
};

/**
 * Demonstrates an `onSign` implementation that rejects the Freighter prompt.
 * The panel catches the rejection and transitions to the `error` state.
 */
export const SignatureRejected: Story = {
  args: {
    onSign: async () => {
      await new Promise((r) => setTimeout(r, 600));
      throw new Error("User rejected the Freighter signing request.");
    },
  },
};
