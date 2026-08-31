import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DASHBOARD_COMMENT_ENDPOINTS } from "@/api/api-endpoint";
import { createApiClient } from "@/api/axios";
import { useGet } from "@/api/queryClient";

export interface DashboardComment {
  id: string | number;
  name: string;
  time: string;
  comment: string;
  avatar?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface CommentsResponse {
  success: boolean;
  data: DashboardComment[];
}

export interface CreateCommentPayload {
  comment: string;
  attachment?: File;
}

export interface CreateCommentResponse {
  success: boolean;
  data: DashboardComment;
}

export const COMMENTS_QUERY_KEY = ["get-dashboard-comments"];

const useCommentServices = () => {
  const queryClient = useQueryClient();

  const useGetComments = (enabled: boolean = true) => {
    return useGet<CommentsResponse>(COMMENTS_QUERY_KEY, DASHBOARD_COMMENT_ENDPOINTS.LIST, {
      enabled,
      staleTime: 1000 * 60,
    });
  };

  const useCreateComment = () => {
    return useMutation<CreateCommentResponse, Error, CreateCommentPayload>({
      mutationFn: async ({ comment, attachment }) => {
        const client = await createApiClient();

        if (attachment) {
          const formData = new FormData();
          formData.append("comment", comment);
          formData.append("attachment", attachment);

          const res = await client.post<CreateCommentResponse>(
            DASHBOARD_COMMENT_ENDPOINTS.CREATE,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
          return res.data;
        }

        const res = await client.post<CreateCommentResponse>(DASHBOARD_COMMENT_ENDPOINTS.CREATE, {
          comment,
        });
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: COMMENTS_QUERY_KEY });
      },
    });
  };

  return { useGetComments, useCreateComment };
};

export default useCommentServices;
