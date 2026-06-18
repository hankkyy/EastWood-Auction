import { MantineThemeOverride } from "@mantine/core";

export const theme: MantineThemeOverride = {
  primaryColor: "violet",
  primaryShade: 9,
  black: "#1a1a1a",
  white: "#fffdf9",
  colors: {
    violet: [
      "#f5f0e9",   // 0 — page bg / card surface
      "#f0e9df",   // 1
      "#e8dfd2",   // 2
      "#d4c8b0",   // 3
      "#b8a88a",   // 4
      "#9b8b6e",   // 5
      "#7a6e56",   // 6
      "#c4a255",   // 7 — gold accent
      "#b8943e",   // 8
      "#a07d30",   // 9
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
      "#f5f0e9",
    ],
  },
  headings: {
    fontFamily: "\"Playfair Display\", Georgia, 'Times New Roman', serif",
    fontWeight: 400,
  },
  globalStyles: (theme) => ({
    "h1, h2, h3, h4, h5, h6": {
      letterSpacing: "-0.02em",
    },
  }),
};
