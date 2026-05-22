import type { NextApiRequest, NextApiResponse } from "next";
import {
  rowToArtwork,
  type ArtworkRow,
} from "@/features/image-search/artworkCloud";
import {
  VISUAL_SEARCH_DEFAULT_THRESHOLD,
  VISUAL_SEARCH_MAX_RESULTS,
} from "@/features/image-search/visualSearchShared";
import { matchArtworkImageViaNode } from "@/features/image-search/visualSearchNode";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const parsedBody =
    typeof req.body === "string"
      ? (() => {
          try {
            return JSON.parse(req.body) as Record<string, unknown>;
          } catch {
            return {};
          }
        })()
      : req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};

  const imageUrl =
    typeof parsedBody.imageUrl === "string" ? parsedBody.imageUrl : "";
  const imageDataUrl =
    typeof parsedBody.imageDataUrl === "string" ? parsedBody.imageDataUrl : "";
  const threshold = Number(
    parsedBody.threshold ?? VISUAL_SEARCH_DEFAULT_THRESHOLD
  );
  const matchCount = Number(
    parsedBody.matchCount ?? VISUAL_SEARCH_MAX_RESULTS
  );

  if (!imageUrl && !imageDataUrl) {
    return res.status(400).json({
      error: "An image source is required.",
      receivedKeys: Object.keys(parsedBody),
      bodyType: typeof req.body,
    });
  }

  try {
    const result = await matchArtworkImageViaNode({
      imageUrl,
      imageDataUrl,
      threshold,
      matchCount,
    });

    const matches = (result.results ?? []).map((row) => ({
      artwork: rowToArtwork(row as unknown as ArtworkRow),
      similarity: row.similarity,
    }));

    return res.status(200).json({
      imageUrl: result.imageUrl,
      threshold: result.matchThreshold ?? threshold,
      matches,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to perform visual matching.",
    });
  }
}
