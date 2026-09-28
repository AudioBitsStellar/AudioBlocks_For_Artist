import type { Meta, StoryObj } from "@storybook/react";
import EarningsRoyalties from "./EarningsRoyalties";

const meta: Meta<typeof EarningsRoyalties> = {
  title: "Dashboard/EarningsRoyalties",
  component: EarningsRoyalties,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Earnings & royalties dashboard panel. Renders an area chart of earnings " +
          "over the last 12 months alongside a platform revenue breakdown table. " +
          "Includes a print/export action and a connected Stellar wallet balance display.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EarningsRoyalties>;

/** Default desktop render with mock earnings data. */
export const Default: Story = {};

/** Tablet viewport — verifies chart responsiveness at 768 px. */
export const TabletLayout: Story = {
  parameters: {
    viewport: { defaultViewport: "tablet" },
  },
};

/** Mobile viewport — single-column stacked layout. */
export const MobileLayout: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
};
