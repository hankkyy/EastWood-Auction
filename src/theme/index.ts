import { MantineThemeOverride } from "@mantine/core";

export const theme: MantineThemeOverride = {
  primaryColor: "violet",
  primaryShade: { light: 7, dark: 7 },
  black: "#1a1815",
  white: "#faf7f2",
  colorScheme: "light",
  colors: {
    violet: [
      "#f5f0e9",   // 0 — light surface / card bg (light mode)
      "#ede6d8",   // 1
      "#e2d8c0",   // 2
      "#d4c8b0",   // 3
      "#b8a88a",   // 4
      "#9b8b6e",   // 5
      "#7a6e56",   // 6
      "#c4a255",   // 7 — gold accent (#c4a255 for both modes)
      "#b8943e",   // 8 — gold accent hover
      "#a07d30",   // 9 — gold accent darker
    ],
    dark: [
      "#1a1815",   // 0 — darkest (bg in dark mode)
      "#25221d",   // 1 — surface in dark mode
      "#36322a",   // 2
      "#4a453b",   // 3
      "#625c50",   // 4
      "#8a8375",   // 5
      "#a59e90",   // 6
      "#c4bfb3",   // 7
      "#e0dcd4",   // 8
      "#f5f0e9",   // 9 — lightest (text in dark mode)
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
    body: {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[0]
          : theme.colors.violet[0],
      color:
        theme.colorScheme === "dark"
          ? theme.colors.dark[9]
          : theme.colors.dark[0],
    },
  }),
};
