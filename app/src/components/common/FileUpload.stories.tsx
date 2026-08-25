import type { Meta, StoryObj } from "@storybook/react";
import FileUpload from "./FileUpload";

const meta: Meta<typeof FileUpload> = {
  title: "Components/Forms/FileUpload",
  component: FileUpload,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    error: { control: "text" },
    helperText: { control: "text" },
    disabled: { control: "boolean" },
    acceptedFormats: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
  args: {
    label: "Album Cover",
    acceptedFormats: "image/jpeg, image/png",
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Audio File",
    acceptedFormats: "audio/mp3, audio/wav",
    helperText: "Upload a high-quality audio file for your track",
  },
};

export const WithError: Story = {
  args: {
    label: "Album Cover",
    error: "File size must be less than 10MB",
  },
};

export const Disabled: Story = {
  args: {
    label: "Cover Image",
    disabled: true,
  },
};
