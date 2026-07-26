import type { Meta, StoryObj } from '@storybook/react';
import MyAlbums from './MyAlbums';

const meta: Meta<typeof MyAlbums> = {
  title: 'Dashboard/MyAlbums',
  component: MyAlbums,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof MyAlbums>;

export const Default: Story = {
  args: {},
};

export const EmptyAlbums: Story = {
  args: {},
};