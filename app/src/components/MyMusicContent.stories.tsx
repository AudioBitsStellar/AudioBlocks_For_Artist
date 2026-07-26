import type { Meta, StoryObj } from '@storybook/react';
import MyMusicContent from './MyMusicContent';

const meta: Meta<typeof MyMusicContent> = {
  title: 'Dashboard/MyMusicContent',
  component: MyMusicContent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof MyMusicContent>;

export const Default: Story = {
  args: {},
};