import type { Meta, StoryObj } from "@storybook/react";
import EditTrackModal from "./EditTrackModal";

const meta: Meta<typeof EditTrackModal> = {
  title: "Dashboard/EditTrackModal",
  component: EditTrackModal,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    open: true,
    onOpenChange: () => {},
    onSave: () => {},
    albumOptions: ["Echoes of the Soul", "Midnight Vibes", "Electric Dreams"],
    track: {
      id: 1,
      title: "Golden Skies",
      albumName: "Echoes of the Soul",
      visibility: "public",
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditTrackModal>;

export const Default: Story = {};
