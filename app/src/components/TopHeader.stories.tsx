import type { Meta, StoryObj } from '@storybook/react';
import TopHeader from './TopHeader';

const meta: Meta<typeof TopHeader> = {
  title: 'Layout/TopHeader',
  component: TopHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
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