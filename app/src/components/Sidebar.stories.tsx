import type { Meta, StoryObj } from "@storybook/react";
import Sidebar from "./Sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "Layout/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The collapsible navigation sidebar rendered on every dashboard route. " +
          "Receives `open` (visibility) and `onClose` (escape/overlay handler) props.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

/** Sidebar closed — only the overlay is hidden; the sidebar is not mounted in the DOM. */
export const Closed: Story = {
  args: {
    open: false,
    onClose: () => {},
  },
};

/** Sidebar fully open — active nav item defaults to the Overview route. */
export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
  },
};

/** Mobile viewport with the sidebar open (full-screen overlay). */
export const MobileOpen: Story = {
  args: {
    open: true,
    onClose: () => {},
  },
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
};
