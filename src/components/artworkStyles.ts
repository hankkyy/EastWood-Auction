export const artworkCardShellBackground = `#ffffff`;

export const artworkImageSurfaceBackground = `#faf8f5`;

export const buildArtworkImageSurfaceSx = (_imageUrl: string) => ({
  background: artworkImageSurfaceBackground,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative" as const,
  border: "none",
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
  fontWeight: 400,
  minHeight: 46,
  paddingLeft: 24,
  paddingRight: 24,
  border: "1px solid #c4a255",
  background: "#c4a255",
  color: "#fff",
  letterSpacing: "0.04em",
  transition: "all 0.3s ease",

  "&:hover": {
    background: "#b8943e",
    borderColor: "#b8943e",
  },
};

export const secondaryActionButtonSx = {
  fontWeight: 400,
  minHeight: 46,
  paddingLeft: 24,
  paddingRight: 24,
  border: "1px solid #d4c8b0",
  background: "transparent",
  color: "#1a1a1a",
  letterSpacing: "0.02em",
  transition: "all 0.3s ease",

  "&:hover": {
    borderColor: "#c4a255",
    color: "#c4a255",
  },
};
