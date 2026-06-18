import type { MantineTheme } from "@mantine/core";

export const appSurfaceBackground = (theme: MantineTheme) =>
  theme.colorScheme === "dark" ? theme.colors.dark[1] : "#fffdf9";

export const appSurfaceBackgroundSubtle = (theme: MantineTheme) =>
  theme.colorScheme === "dark" ? "rgba(37, 34, 29, 0.88)" : "rgba(255, 253, 249, 0.92)";

export const appSurfaceBorder = (theme: MantineTheme) =>
  theme.colorScheme === "dark" ? "rgba(196, 162, 85, 0.12)" : "rgba(180, 158, 120, 0.16)";

export const appTextColor = (theme: MantineTheme) =>
  theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0];

export const appMutedTextColor = (theme: MantineTheme) =>
  theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.dark[4];

export const appFieldLabelColor = (theme: MantineTheme) =>
  theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.colors.dark[0];

/**
 * Premium card background — warm paper texture with subtle grain.
 * Mimics handmade paper used in high-end auction catalogs.
 * Layered: warm gradient base + micro vertical striation.
 */
export const artworkCardShellBackground = (theme: MantineTheme) =>
  theme.colorScheme === "dark"
    ? "linear-gradient(175deg, #2a2620 0%, #25221d 40%, #1f1c17 100%)"
    : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%)";

/**
 * Subtle grain texture overlay — applied via ::before or as a second bg layer.
 * Pure CSS: repeating sub-pixel lines that read as paper fiber.
 */
export const cardTextureOverlay = (theme: MantineTheme) =>
  theme.colorScheme === "dark"
    ? "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 6px)"
    : "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)";

/**
 * Premium multi-layer shadow system.
 * Umbra + penumbra + ambient — creates genuine depth without harsh edges.
 */
export const cardShadow = (theme: MantineTheme) =>
  theme.colorScheme === "dark"
    ? "0 1px 3px rgba(0,0,0,0.20), 0 6px 20px rgba(0,0,0,0.28), 0 23px 52px rgba(0,0,0,0.34)"
    : "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06), 0 23px 52px rgba(0,0,0,0.08)";

/**
 * Hover shadow — lifts with a subtle golden aura.
 */
export const cardShadowHover = (theme: MantineTheme) =>
  theme.colorScheme === "dark"
    ? "0 2px 6px rgba(196, 162, 85, 0.08), 0 10px 30px rgba(0,0,0,0.32), 0 28px 64px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(196,162,85,0.05)"
    : "0 2px 6px rgba(196, 162, 85, 0.06), 0 10px 30px rgba(0,0,0,0.08), 0 28px 64px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(196,162,85,0.06)";

/**
 * Inner rim light — subtle top highlight giving cards a raised, tangible quality.
 * Applied via ::before or ::after pseudo-element.
 */
export const cardInnerRim = (theme: MantineTheme) =>
  theme.colorScheme === "dark"
    ? "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.12)"
    : "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.04)";

/**
 * Gold border — thin, elegant. Used for card edges.
 */
export const cardBorder = (theme: MantineTheme) =>
  theme.colorScheme === "dark"
    ? "1px solid rgba(196, 162, 85, 0.12)"
    : "1px solid rgba(180, 158, 120, 0.18)";

/**
 * Gold border on hover — slightly more pronounced.
 */
export const cardBorderHover = (theme: MantineTheme) =>
  theme.colorScheme === "dark"
    ? "1px solid rgba(196, 162, 85, 0.28)"
    : "1px solid rgba(196, 162, 85, 0.30)";

// ── Image surface ──────────────────────────────────────────────────

export const artworkImageSurfaceBackground = (theme: MantineTheme) =>
  theme.colorScheme === "dark" ? "#1a1815" : "#f5f0e9";

export const buildArtworkImageSurfaceSx = (_imageUrl: string) => (theme: MantineTheme) => ({
  background: artworkImageSurfaceBackground(theme),
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative" as const,
  border: "none",
});

// ── Badge styles ───────────────────────────────────────────────────

export const artworkSourceBadgeSx = (isOfficial?: boolean, theme?: MantineTheme) => ({
  alignSelf: "flex-start" as const,
  backgroundColor: isOfficial === true ? "rgba(59, 130, 246, 0.14)" : "rgba(34, 197, 94, 0.14)",
  color: isOfficial === true
    ? (theme?.colorScheme === "dark" ? "#93c5fd" : "#1e40af")
    : (theme?.colorScheme === "dark" ? "#86efac" : "#166534"),
  border: `1px solid ${isOfficial === true ? "rgba(59, 130, 246, 0.28)" : "rgba(34, 197, 94, 0.28)"}`,
  letterSpacing: "0.04em",
  fontWeight: 600,
  backdropFilter: "blur(6px)",
});

// ── Button styles ──────────────────────────────────────────────────

export const primaryActionButtonSx = {
  fontWeight: 400,
  minHeight: 46,
  paddingLeft: 24,
  paddingRight: 24,
  border: "1px solid #c4a255",
  background: "#c4a255",
  color: "#1a1815",
  letterSpacing: "0.04em",
  transition: "all 0.3s ease",

  "&:hover": {
    background: "#b8943e",
    borderColor: "#b8943e",
    color: "#1a1815",
  },
};

export const secondaryActionButtonSx = (theme: MantineTheme) => ({
  fontWeight: 400,
  minHeight: 46,
  paddingLeft: 24,
  paddingRight: 24,
  border: `1px solid ${theme.colorScheme === "dark" ? theme.colors.dark[3] : "#d4c8b0"}`,
  background: "transparent",
  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
  letterSpacing: "0.02em",
  transition: "all 0.3s ease",

  "&:hover": {
    borderColor: "#c4a255",
    color: "#c4a255",
  },
});
