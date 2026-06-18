import { MantineThemeOverride } from "@mantine/core";

export const theme: MantineThemeOverride = {
  colorScheme: "light",
  primaryColor: "violet",
  primaryShade: 9,
  black: "#1a1a1a",
  white: "#faf8f5",
  colors: {
    violet: [
      "#faf8f5",
      "#f2ede5",
      "#e8e0d5",
      "#d4c8b0",
      "#b8a88a",
      "#9b8b6e",
      "#7a6e56",
      "#d8b76d",
      "#c4a255",
      "#b8943e",
    ],
    dark: [
      "#1a1a1a",
      "#2d2d2d",
      "#404040",
      "#595959",
      "#737373",
      "#a3a3a3",
      "#c4c4c4",
      "#d9d9d9",
      "#ebebeb",
      "#faf8f5",
    ],
  },
  headings: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 400,
  },
  globalStyles: (theme) => ({
    "h1, h2, h3, h4, h5, h6": {
      letterSpacing: "-0.02em",
    },
  }),
};
