"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Send, Paperclip, User, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { sanitize } from "@/utils/sanitize";
import EmptyState from "./shared/EmptyState";
import useCommentServices, { DashboardComment } from "@/services/commentService";

const COMMENT_MAX_LENGTH = 500;
const COMMENT_WARN_THRESHOLD = COMMENT_MAX_LENGTH * 0.9;

const avatarColors = ["bg-purple-600", "bg-blue-600", "bg-pink-600", "bg-emerald-600"];

const formatCommentTime = (time: string) => {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getAvatarColor = (comment: DashboardComment, index: number) => {
  if (comment.avatar && avatarColors.includes(comment.avatar)) return comment.avatar;
  return avatarColors[index % avatarColors.length];
};

export default function Comments() {
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { useGetComments, useCreateComment } = useCommentServices();
  const { data, isLoading, isError, refetch } = useGetComments();
  const createComment = useCreateComment();
  const comments = data?.data ?? [];
  const isNearLimit = draft.length >= COMMENT_WARN_THRESHOLD;
  const isSubmitDisabled = draft.trim().length === 0 || createComment.isPending;

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachment(event.target.files?.[0]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const comment = draft.trim();
    if (!comment) return;

    try {
      await createComment.mutateAsync({ comment, attachment });
      setDraft("");
      setAttachment(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Comment posted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    }
  };

  return (
    <div className="bg-[#1E1E1E] rounded-lg p-6">
      <h2 className="text-white text-xl font-semibold mb-6">Comments</h2>

      <div className="space-y-4 mb-6">
        {isLoading ? (
          <div className="py-10 text-center text-gray-400" role="status">
            Loading comments...
          </div>
        ) : isError ? (
          <EmptyState
            icon={MessageCircle}
            title="Unable to load comments"
            description="We could not fetch your latest comments."
            ctaLabel="Retry"
            onCta={() => refetch()}
          />
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No comments yet"
            description="Fan and admin comments will appear here once they are posted."
          />
        ) : (
          comments.map((comment, index) => (
            <div key={comment.id} className="flex gap-3">
              <div
                className={`w-10 h-10 rounded-full ${getAvatarColor(comment, index)} flex items-center justify-center flex-shrink-0`}
              >
                <User size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold text-sm">{sanitize(comment.name)}</span>
                  <span className="text-gray-400 text-sm">{formatCommentTime(comment.time)}</span>
                </div>
                <p className="text-gray-300 text-sm">{sanitize(comment.comment)}</p>
                {comment.attachmentUrl && (
                  <a
                    href={comment.attachmentUrl}
                    className="mt-2 inline-flex text-pink-500 hover:text-pink-400 text-sm underline"
                  >
                    {sanitize(comment.attachmentName ?? "View attachment")}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleAttachmentChange}
          aria-label="Comment attachment"
        />
        <button
          type="button"
          aria-label="Attach file to comment"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center min-w-11 min-h-11 text-gray-400 hover:text-white transition-colors"
        >
          <Paperclip size={20} />
        </button>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Type here"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
            maxLength={COMMENT_MAX_LENGTH}
            className="w-full bg-[#161616] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 text-sm"
          />
          {attachment && (
            <p className="mt-1 text-xs text-gray-400 truncate">
              Attached: {sanitize(attachment.name)}
            </p>
          )}
          {isNearLimit && (
            <p
              className={`mt-1 text-xs text-right ${draft.length >= COMMENT_MAX_LENGTH ? "text-red-500" : "text-yellow-500"}`}
            >
              {draft.length}/{COMMENT_MAX_LENGTH}
            </p>
          )}
        </div>
        <button
          type="submit"
          aria-label="Post comment"
          disabled={isSubmitDisabled}
          className="flex items-center justify-center min-w-11 min-h-11 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
