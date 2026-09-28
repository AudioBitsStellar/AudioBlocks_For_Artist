import type { Meta, StoryObj } from "@storybook/react";
import OverviewCards from "./OverviewCards";

const meta: Meta<typeof OverviewCards> = {
  title: "Dashboard/OverviewCards",
  component: OverviewCards,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "KPI summary card grid rendered at the top of the artist Overview page. " +
          "Displays Songs Published, Total Earnings, Listeners Count, and Most Streamed Region. " +
          "Renders mock data when `featureFlags.useMockOverviewCards` is enabled; " +
          "otherwise fetches live data from the Overview API.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OverviewCards>;

/**
 * Default render — uses the mock data path (active in most non-production
 * environments via `featureFlags.useMockOverviewCards`).
 */
export const Default: Story = {};

/** Tablet viewport to verify the 2-column grid layout. */
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
