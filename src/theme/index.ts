import { MantineThemeOverride } from "@mantine/core";

export const theme: MantineThemeOverride = {
  colorScheme: "dark",
  primaryColor: "violet",
  primaryShade: 9,
  black: "#0f1216",
  white: "#f6efe3",
  colors: {
    violet: [
      "#20262e",
      "#29313b",
      "#33404c",
      "#435264",
      "#5d7187",
      "#7f97ad",
      "#aebccc",
      "#d8b76d",
      "#172332",
      "#caa45a",
    ],
    dark: [
      "#f6efe3",
      "#d8d0c5",
      "#b8b0a7",
      "#928b84",
      "#6f6964",
      "#3b414a",
      "#252b33",
      "#1b2027",
      "#15191f",
      "#0f1216",
    ],
  },
  headings: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 600,
  },
};
