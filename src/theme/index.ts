import { MantineThemeOverride } from "@mantine/core";
import {
  appFieldLabelColor,
  appMutedTextColor,
  appSurfaceBackground,
  appSurfaceBackgroundSubtle,
  appSurfaceBorder,
  appTextColor,
} from "@/components/artworkStyles";

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
      "#aba398",   // 2 — dimmed text (≥7:1 contrast on #1a1815)
      "#4a453b",   // 3
      "#625c50",   // 4
      "#bdb6aa",   // 5 — muted text (footer links, helper text)
      "#c2bbb0",   // 6
      "#d5d0c7",   // 7 — nav links, secondary headings
      "#e6e2db",   // 8 — form labels, subtle headings
      "#f5f0e9",   // 9 — lightest (primary text in dark mode)
    ],
  },
  headings: {
    fontFamily: "var(--font-playfair), Georgia, 'Times New Roman', serif",
    fontWeight: 400,
  },
  globalStyles: (theme) => ({
    // Selection highlight — adapts to dark/light mode
    "::selection": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? "rgba(196, 162, 85, 0.30)"
          : "rgba(216, 183, 109, 0.35)",
      color: theme.colorScheme === "dark" ? theme.colors.dark[9] : "#4a3f2a",
    },
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
    // Card surfaces use dark[1] in dark mode instead of Mantine's default
    // dark[7] (#c4bfb3) which gives only 2.2:1 contrast with dimmed text.
    // Individual Paper variants are styled below — global .mantine-Paper-root
    // is intentionally skipped because it breaks Menu/Tooltip dropdowns.
    ".mantine-Card-root": {
      backgroundColor: `${appSurfaceBackground(theme)} !important`,
      color: `${appTextColor(theme)} !important`,
    },
    ".mantine-Header-root, .mantine-Menu-dropdown, .mantine-Modal-content, .mantine-Drawer-content, .mantine-Popover-dropdown": {
      backgroundColor: `${appSurfaceBackground(theme)} !important`,
      color: `${appTextColor(theme)} !important`,
      borderColor: `${appSurfaceBorder(theme)} !important`,
    },
    ".mantine-Modal-title, .mantine-Drawer-title, .mantine-Menu-itemLabel": {
      color: `${appTextColor(theme)} !important`,
    },
    ".mantine-Notification-root": {
      backgroundColor: `${appSurfaceBackground(theme)} !important`,
      color: `${appTextColor(theme)} !important`,
      border: `1px solid ${appSurfaceBorder(theme)} !important`,
    },
    ".mantine-Notification-title, .mantine-Notification-description, .mantine-Notification-closeButton": {
      color: `${appTextColor(theme)} !important`,
    },
    ".mantine-Input-input, .mantine-Textarea-input, .mantine-Select-input, .mantine-NumberInput-input, .mantine-MultiSelect-input, .mantine-PasswordInput-innerInput": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? `${appSurfaceBackgroundSubtle(theme)} !important`
          : "#fff !important",
      color: `${appTextColor(theme)} !important`,
      borderColor: `${appSurfaceBorder(theme)} !important`,
    },
    ".mantine-Input-input::placeholder, .mantine-Textarea-input::placeholder, .mantine-Select-input::placeholder, .mantine-NumberInput-input::placeholder, .mantine-MultiSelect-input::placeholder, .mantine-PasswordInput-innerInput::placeholder": {
      color: `${appMutedTextColor(theme)} !important`,
      opacity: 1,
    },
    ".mantine-InputWrapper-label": {
      color: `${appFieldLabelColor(theme)} !important`,
    },
    ".mantine-InputWrapper-description, .mantine-InputWrapper-error, .mantine-Text-root[data-muted]": {
      color: `${appMutedTextColor(theme)} !important`,
    },
    ".mantine-Tabs-tab": {
      color: `${appTextColor(theme)} !important`,
      "&[data-active]": {
        color: `${appTextColor(theme)} !important`,
      },
    },
  }),
};
