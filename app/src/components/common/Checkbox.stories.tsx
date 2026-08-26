import type { Meta, StoryObj } from "@storybook/react";
import Checkbox from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Forms/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
    checked: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    label: "I agree to the Terms of Service",
  },
};

export const Checked: Story = {
  args: {
    label: "Subscribe to newsletter",
    checked: true,
  },
};

export const WithError: Story = {
  args: {
    label: "I agree to the Terms of Service",
    error: "You must agree to the terms",
  },
};

export const Disabled: Story = {
  args: {
    label: "Option unavailable",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: "Pre-selected option",
    disabled: true,
    checked: true,
  },
};
