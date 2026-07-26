import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Layout/DashboardLayout',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Meta>;

export const Default: Story = {
  args: {},
};