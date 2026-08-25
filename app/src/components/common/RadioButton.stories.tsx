import type { Meta, StoryObj } from "@storybook/react";
import RadioButton from "./RadioButton";

const meta: Meta<typeof RadioButton> = {
  title: "Components/Forms/RadioButton",
  component: RadioButton,
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
type Story = StoryObj<typeof RadioButton>;

export const Default: Story = {
  args: {
    label: "Standard Royalties",
    name: "royalty_type",
  },
};

export const Checked: Story = {
  args: {
    label: "Premium Royalties",
    name: "royalty_type",
    checked: true,
  },
};

export const WithError: Story = {
  args: {
    label: "Standard Royalties",
    name: "royalty_type",
    error: "You must select a royalty type",
  },
};

export const Disabled: Story = {
  args: {
    label: "Exclusive Rights",
    name: "royalty_type",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: "Default License",
    name: "royalty_type",
    disabled: true,
    checked: true,
  },
};
