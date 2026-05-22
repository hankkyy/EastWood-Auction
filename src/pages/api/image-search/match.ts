import type { NextApiRequest, NextApiResponse } from "next";
import {
  rowToArtwork,
  type ArtworkRow,
} from "@/features/image-search/artworkCloud";
import {
  matchArtworkImage,
} from "@/features/image-search/visualSearchServer";
import {
  VISUAL_SEARCH_DEFAULT_THRESHOLD,
  VISUAL_SEARCH_MAX_RESULTS,
} from "@/features/image-search/visualSearchShared";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl : "";
  const threshold = Number(req.body?.threshold ?? VISUAL_SEARCH_DEFAULT_THRESHOLD);
  const matchCount = Number(req.body?.matchCount ?? VISUAL_SEARCH_MAX_RESULTS);

  if (!imageUrl) {
    return res.status(400).json({ error: "An image URL is required." });
  }

  try {
    const result = await matchArtworkImage({
      imageUrl,
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
