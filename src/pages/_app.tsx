import React, { useState, useEffect, useCallback } from "react";
import type { AppProps } from "next/app";
import { MantineProvider, ColorSchemeProvider, ColorScheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/theme";
import { RouterTransition } from "@/components/RouterTransition";
import { I18nProvider } from "@/i18n";

import "@/styles/globals.css";

const COLOR_SCHEME_KEY = "eastwood-color-scheme";

function getSystemScheme(): ColorScheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredScheme(): ColorScheme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(COLOR_SCHEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

const config = {
  rules: [{ id: "skip-link", enabled: true }],
};

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const ReactDOM = require("react-dom");
  const axe = require("@axe-core/react");
  axe(React, ReactDOM, 1000, config);
}

export default function App({ Component, pageProps }: AppProps) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    // Read from localStorage or system preference BEFORE first render — no flash
    return getStoredScheme() ?? getSystemScheme();
  });

  // Listen for system changes (only when no manual preference is set)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!getStoredScheme()) {
        setColorScheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleColorScheme = useCallback((value?: ColorScheme) => {
    const next = value || (colorScheme === "dark" ? "light" : "dark");
    setColorScheme(next);
    localStorage.setItem(COLOR_SCHEME_KEY, next);
  }, [colorScheme]);

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{ ...theme, colorScheme }}
      >
        <I18nProvider>
          <RouterTransition />
          <Notifications position="top-right" />
          <Component {...pageProps} />
        </I18nProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
