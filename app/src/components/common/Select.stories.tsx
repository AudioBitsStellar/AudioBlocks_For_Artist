import type { Meta, StoryObj } from '@storybook/react';
import Select from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Forms/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    helperText: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

const genreOptions = [
  { label: 'Pop', value: 'pop' },
  { label: 'Hip Hop', value: 'hip_hop' },
  { label: 'R&B', value: 'rnb' },
  { label: 'Electronic', value: 'electronic' },
  { label: 'Rock', value: 'rock' },
];

export const Default: Story = {
  args: {
    label: 'Genre',
    options: genreOptions,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Primary Genre',
    options: genreOptions,
    helperText: 'Select the genre that best describes your music',
  },
};

export const WithError: Story = {
  args: {
    label: 'Genre',
    options: genreOptions,
    error: 'Please select a valid genre',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Genre',
    options: genreOptions,
    disabled: true,
  },
};
