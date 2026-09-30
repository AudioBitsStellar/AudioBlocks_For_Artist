import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import EditTrackModal from "@/components/common/modals/EditTrackModal";
import { applyTrackEdit } from "@/services/trackService";

const track = {
  id: 1,
  title: "Golden Skies",
  albumName: "Echoes of the Soul",
  visibility: "public" as const,
  genre: "",
  description: "",
};

function setup(overrides: Partial<React.ComponentProps<typeof EditTrackModal>> = {}) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <EditTrackModal
      open
      onOpenChange={onOpenChange}
      track={track}
      albumOptions={["Echoes of the Soul", "Night Drive"]}
      onSave={onSave}
      {...overrides}
    />
  );
  return { onSave, onOpenChange, dialog: screen.getByRole("dialog") };
}

describe("EditTrackModal (#396)", () => {
  it("edits genre and description and saves the validated values", async () => {
    const { onSave, onOpenChange, dialog } = setup();
    fireEvent.change(within(dialog).getByLabelText("Genre"), { target: { value: "Afrobeats" } });
    fireEvent.change(within(dialog).getByLabelText("Description"), {
      target: { value: "  Recorded live in Lagos  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: "Golden Skies",
      genre: "Afrobeats",
      description: "Recorded live in Lagos",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a live description counter and rejects descriptions over 500 characters", async () => {
    const { onSave, dialog } = setup();
    const description = within(dialog).getByLabelText("Description");
    fireEvent.change(description, { target: { value: "x".repeat(501) } });
    expect(within(dialog).getByText("501/500")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(await within(dialog).findByText("Description must be 500 characters or less")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closes immediately when nothing was changed", () => {
    const { onOpenChange, dialog } = setup();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("asks before discarding unsaved edits, and Keep editing keeps them", () => {
    const { onOpenChange, dialog } = setup();
    const title = within(dialog).getByLabelText(/track title/i);
    fireEvent.change(title, { target: { value: "Golden Hour" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Discard unsaved changes?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }));
    expect(within(dialog).queryByText("Discard unsaved changes?")).not.toBeInTheDocument();
    expect(title).toHaveValue("Golden Hour");
  });

  it("closes without saving when the artist confirms Discard", () => {
    const { onSave, onOpenChange, dialog } = setup();
    fireEvent.change(within(dialog).getByLabelText(/track title/i), { target: { value: "Golden Hour" } });
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("applyTrackEdit genre/description (#396)", () => {
  const tracks = [{ id: 1, title: "A", albumName: "X", genre: "Pop", description: "old" }];

  it("replaces genre/description only when the edit carries them", () => {
    expect(applyTrackEdit(tracks, { id: 1, title: "A", albumName: "X" })[0]).toMatchObject({
      genre: "Pop",
      description: "old",
    });
    expect(
      applyTrackEdit(tracks, { id: 1, title: "A", albumName: "X", genre: "Jazz", description: "" })[0]
    ).toMatchObject({ genre: "Jazz", description: "" });
  });
});
