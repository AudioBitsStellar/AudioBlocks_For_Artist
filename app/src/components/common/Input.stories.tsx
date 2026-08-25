import type { Meta, StoryObj } from "@storybook/react";
import Input from "./Input";

const meta: Meta<typeof Input> = {
  title: "Components/Forms/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    error: { control: "text" },
    helperText: { control: "text" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: "Username",
    placeholder: "Enter your username",
  },
};

export const Focused: Story = {
  args: {
    label: "Email",
    placeholder: "Enter your email",
    autoFocus: true,
  },
};

export const WithError: Story = {
  args: {
    label: "Password",
    type: "password",
    placeholder: "Enter your password",
    error: "Password must be at least 8 characters",
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Wallet Address",
    placeholder: "0x...",
    helperText: "Enter your Stellar wallet address to receive payments",
  },
};

export const Disabled: Story = {
  args: {
    label: "Artist Handle",
    placeholder: "@username",
    disabled: true,
    value: "@awesomeartist",
  },
};
