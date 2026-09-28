import type { Meta, StoryObj } from "@storybook/react";
import FileUpload from "./FileUpload";
import { COVER_IMAGE_RULES } from "@/utils/fileValidation";

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

export const WithValidationRules: Story = {
  args: {
    label: "Cover Image",
    validationRules: COVER_IMAGE_RULES,
    helperText: "Files over 5 MB or in another format are rejected with an inline error",
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
