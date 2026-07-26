import type { Meta, StoryObj } from '@storybook/react';
import MerchesContent from './MerchesContent';

const meta: Meta<typeof MerchesContent> = {
  title: 'Dashboard/MerchesContent',
  component: MerchesContent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof MerchesContent>;

export const Default: Story = {
  args: {},
};

export const EmptyMerches: Story = {
  args: {},
};