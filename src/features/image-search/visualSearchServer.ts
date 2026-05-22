import {
  VISUAL_SEARCH_DEFAULT_THRESHOLD,
  VISUAL_SEARCH_FUNCTION_NAME,
  VISUAL_SEARCH_MAX_RESULTS,
  type VisualSearchFunctionRequest,
  type VisualSearchFunctionResponse,
} from "@/features/image-search/visualSearchShared";
import { assertSupabaseServerConfig } from "@/lib/supabase/config";

const getVisualSearchFunctionUrl = () => {
  const { url } = assertSupabaseServerConfig();
  return `${url}/functions/v1/${VISUAL_SEARCH_FUNCTION_NAME}`;
};

export const invokeVisualSearchFunction = async (
  payload: VisualSearchFunctionRequest
): Promise<VisualSearchFunctionResponse> => {
  const { serviceRoleKey } = assertSupabaseServerConfig();
  const response = await fetch(getVisualSearchFunctionUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  const parsedBody = responseText
    ? (JSON.parse(responseText) as VisualSearchFunctionResponse)
    : null;

  if (!response.ok || !parsedBody?.ok) {
    throw new Error(
      parsedBody?.error ||
        `Visual search function request failed with status ${response.status}.`
    );
  }

  return parsedBody;
};

export const triggerArtworkImageIndexing = async (params: {
  artworkId: string;
  imageUrl: string;
  force?: boolean;
}) =>
  invokeVisualSearchFunction({
    action: "index-artwork",
    artworkId: params.artworkId,
    imageUrl: params.imageUrl,
    force: params.force ?? false,
  });

export const matchArtworkImage = async (params: {
  imageUrl: string;
  threshold?: number;
  matchCount?: number;
}) =>
  invokeVisualSearchFunction({
    action: "match-image",
    imageUrl: params.imageUrl,
    threshold: params.threshold ?? VISUAL_SEARCH_DEFAULT_THRESHOLD,
    matchCount: Math.min(
      params.matchCount ?? VISUAL_SEARCH_MAX_RESULTS,
      VISUAL_SEARCH_MAX_RESULTS
    ),
  });
