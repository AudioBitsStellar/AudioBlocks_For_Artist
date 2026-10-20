import type { Meta, StoryObj } from "@storybook/react";
import MusicLoader from "./MusicLoader";

const meta: Meta<typeof MusicLoader> = {
  title: "Feedback/MusicLoader",
  component: MusicLoader,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Animated equalizer used while audio is loading or playing. " +
          "The `small` prop switches between the compact (16px) and default (32px) heights.",
      },
    },
  },
  argTypes: {
    small: {
      control: "boolean",
      description: "Render the compact loader used in inline/table contexts.",
    },
  },
};

export default meta;
type Story = StoryObj<typeof MusicLoader>;

/** Default loader used on large surfaces. */
export const Default: Story = {
  args: {
    small: false,
  },
};

/** Compact loader used in rows and inline players. */
export const Small: Story = {
  args: {
    small: true,
  },
};
