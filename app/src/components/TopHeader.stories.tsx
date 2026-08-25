import type { Meta, StoryObj } from "@storybook/react";
import { RoleProvider } from "@/context/RoleContext";
import TopHeader from "./TopHeader";

const meta: Meta<typeof TopHeader> = {
  title: "Layout/TopHeader",
  component: TopHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <RoleProvider>
        <Story />
      </RoleProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TopHeader>;

export const Default: Story = {
  args: {
    onMenuClick: () => {},
    sidebarOpen: false,
  },
};

export const SidebarOpen: Story = {
  args: {
    onMenuClick: () => {},
    sidebarOpen: true,
  },
};

// Issue #172 – verify the notification count badge renders the right value.
export const WithNotifications: Story = {
  args: {
    onMenuClick: () => {},
    sidebarOpen: false,
    notificationCount: 7,
  },
};

export const WithAlotOfNotifications: Story = {
  args: {
    onMenuClick: () => {},
    sidebarOpen: false,
    notificationCount: 150,
  },
};

// Issue #173 – the role chip reflects the user's permission level.
export const Manager: Story = {
  args: {
    onMenuClick: () => {},
    sidebarOpen: false,
    userName: "Ada Lovelace",
    userRole: "manager",
  },
};

export const Viewer: Story = {
  args: {
    onMenuClick: () => {},
    sidebarOpen: false,
    userName: "Grace Hopper",
    userRole: "viewer",
  },
};
