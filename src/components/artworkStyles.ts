export const artworkCardShellBackground = `
  linear-gradient(180deg, rgba(36, 31, 27, 0.98), rgba(24, 24, 26, 0.99))
`;

export const artworkImageSurfaceBackground = `
  linear-gradient(180deg, rgba(49, 43, 37, 0.92), rgba(31, 32, 36, 0.96))
`;

export const buildArtworkImageSurfaceSx = (_imageUrl: string) => ({
  background: artworkImageSurfaceBackground,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative" as const,
  border: "1px solid rgba(221, 189, 122, 0.12)",
  boxShadow: "inset 0 1px 0 rgba(255, 250, 240, 0.04)",
});

export const artworkSourceBadgeSx = (isOfficial?: boolean) => ({
  alignSelf: "flex-start" as const,
  backgroundColor: isOfficial === true ? "rgba(59, 130, 246, 0.14)" : "rgba(34, 197, 94, 0.14)",
  color: isOfficial === true ? "#93c5fd" : "#86efac",
  border: `1px solid ${isOfficial === true ? "rgba(59, 130, 246, 0.28)" : "rgba(34, 197, 94, 0.28)"}`,
  letterSpacing: "0.04em",
  fontWeight: 600,
  backdropFilter: "blur(6px)",
});

export const primaryActionButtonSx = {
  fontWeight: 600,
  minHeight: 46,
  paddingLeft: 24,
  paddingRight: 24,
  border: "1px solid rgba(87, 138, 255, 0.22)",
  background: "linear-gradient(180deg, #356fe0, #2d5fc0)",
  boxShadow: "0 10px 24px rgba(20, 35, 68, 0.26)",
  transition: "all 0.2s ease",
  display: "inline-flex",
  alignItems: "center",
  color: "#f8fbff",

  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 14px 28px rgba(20, 35, 68, 0.32)",
    background: "linear-gradient(180deg, #3a78f3, #2f64ca)",
  },
};

export const secondaryActionButtonSx = {
  fontWeight: 600,
  minHeight: 46,
  paddingLeft: 24,
  paddingRight: 24,
  border: "1px solid rgba(216, 183, 109, 0.18)",
  background: "linear-gradient(180deg, rgba(255, 250, 241, 0.04), rgba(255, 255, 255, 0.02))",
  color: "#f2e9d8",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  transition: "all 0.2s ease",
  display: "inline-flex",
  alignItems: "center",

  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: "rgba(216, 183, 109, 0.32)",
    background: "linear-gradient(180deg, rgba(255, 250, 241, 0.06), rgba(255, 255, 255, 0.03))",
  },
};
