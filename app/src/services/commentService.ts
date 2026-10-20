import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DASHBOARD_COMMENT_ENDPOINTS } from "@/api/api-endpoint";
import { createApiClient } from "@/api/axios";
import { useGet } from "@/api/queryClient";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import type { CommentsResponse, CreateCommentPayload, CreateCommentResponse, DashboardComment } from "@/types/api";

// Response types live in the central `@/types/api` module (#140); re-exported
// here so existing imports from this service keep working.
export type { CommentsResponse, CreateCommentPayload, CreateCommentResponse, DashboardComment } from "@/types/api";

export const COMMENTS_QUERY_KEY = DASHBOARD_QUERY_KEYS.comments;

export interface CreateCommentPayloadExtended extends CreateCommentPayload {
  songId?: string;
  isArtist?: boolean;
  parentId?: string;
}

const useCommentServices = () => {
  const queryClient = useQueryClient();

  const useGetComments = (enabled: boolean = true) => {
    return useGet<CommentsResponse>(COMMENTS_QUERY_KEY, DASHBOARD_COMMENT_ENDPOINTS.LIST, {
      enabled,
      staleTime: DASHBOARD_CACHE.comments,
    });
  };

  const useGetSongComments = (songId: string, enabled: boolean = true) => {
    return useGet<CommentsResponse>(
      ["song-comments", songId],
      DASHBOARD_COMMENT_ENDPOINTS.SONG_COMMENTS(songId),
      {
        enabled: Boolean(songId) && enabled,
        staleTime: DASHBOARD_CACHE.comments,
      }
    );
  };

  const useCreateComment = () => {
    return useMutation<CreateCommentResponse, Error, CreateCommentPayloadExtended>({
      mutationFn: async ({ comment, attachment, songId, isArtist = true, parentId }) => {
        const client = await createApiClient();
        const endpoint = songId
          ? DASHBOARD_COMMENT_ENDPOINTS.CREATE_SONG_COMMENT(songId)
          : DASHBOARD_COMMENT_ENDPOINTS.CREATE;

        if (attachment) {
          const formData = new FormData();
          formData.append("comment", comment);
          formData.append("attachment", attachment);
          if (isArtist) formData.append("isArtist", "true");
          if (parentId) formData.append("parentId", parentId);

          const res = await client.post<CreateCommentResponse>(endpoint, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return res.data;
        }

        const res = await client.post<CreateCommentResponse>(endpoint, {
          comment,
          isArtist,
          parentId,
        });
        return res.data;
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: COMMENTS_QUERY_KEY });
        if (variables.songId) {
          queryClient.invalidateQueries({ queryKey: ["song-comments", variables.songId] });
        }
      },
    });
  };

  return { useGetComments, useGetSongComments, useCreateComment };
};

export default useCommentServices;
