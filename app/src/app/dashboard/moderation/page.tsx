"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Breadcrumb from "@/components/Breadcrumb";
import ConfirmationDialog from "@/components/shared/ConfirmationDialog";
import CommentModerationView from "@/components/CommentModerationView";
import useCommentServices, { DashboardComment } from "@/services/commentService";
import {
  bulkSetModerationStatus,
  getModerationMap,
  setModerationStatus,
  type ModerationMap,
  type ModerationStatus,
} from "@/services/commentModerationService";

export default function ModerationPage() {
  const { useGetComments } = useCommentServices();
  const { data, isLoading, isError, refetch } = useGetComments();
  const [moderation, setModeration] = useState<ModerationMap>({});
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  useEffect(() => {
    setModeration(getModerationMap());
  }, []);

  const comments: DashboardComment[] = data?.data ?? [];

  const handleModerate = (ids: string[], status: ModerationStatus) => {
    if (status === "removed" && ids.length === 1) {
      setPendingRemoval(ids[0]);
      return;
    }

    if (ids.length === 1) {
      setModeration(setModerationStatus(ids[0], status));
    } else {
      setModeration(bulkSetModerationStatus(ids, status));
    }

    const label =
      status === "visible"
        ? "restored"
        : status === "hidden"
          ? "hidden from fans"
          : status === "flagged"
            ? "flagged for review"
            : "removed";
    toast.success(`${ids.length} comment${ids.length > 1 ? "s" : ""} ${label}.`);
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    setModeration(setModerationStatus(pendingRemoval, "removed", "Removed by the artist"));
    toast.success("Comment removed from your feed.");
    setPendingRemoval(null);
  };

  return (
    <div>
      <Breadcrumb items={[{ label: "Moderation", isActive: true }]} />

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-text">Fan engagement moderation</h1>
        <p className="text-sm text-text-muted">
          Review what fans are saying on your songs. Hide, flag or remove anything that should not
          be public.
        </p>
      </div>

      <div className="mt-6">
        <CommentModerationView
          comments={comments}
          moderation={moderation}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onModerate={handleModerate}
        />
      </div>

      <ConfirmationDialog
        isOpen={Boolean(pendingRemoval)}
        onClose={() => setPendingRemoval(null)}
        onConfirm={confirmRemoval}
        title="Delete this comment?"
        message="The comment will be removed from your feed. You can restore it later from the Removed filter."
        confirmText="Delete comment"
      />
    </div>
  );
}
