import React, { useState, useEffect, useCallback } from "react";
import type { AppProps } from "next/app";
import { MantineProvider, ColorSchemeProvider, ColorScheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/theme";
import { RouterTransition } from "@/components/RouterTransition";
import { I18nProvider } from "@/i18n";
import { Playfair_Display, Poppins } from "next/font/google";

import "@/styles/globals.css";

// Self-host Google Fonts to avoid blocked external requests in China
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

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

  // Register Service Worker for PWA offline support
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let swRegistration: ServiceWorkerRegistration | null = null;

    const registerSW = async () => {
      try {
        swRegistration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log("[PWA] Service Worker registered:", swRegistration.scope);

        // Check for updates
        swRegistration.addEventListener("updatefound", () => {
          const installing = swRegistration?.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // New SW installed and waiting — activate immediately
              console.log("[PWA] New version available — activating");
              installing.postMessage("skipWaiting");
              // Reload to pick up new assets
              window.location.reload();
            }
          });
        });
      } catch (err) {
        console.warn("[PWA] Service Worker registration failed:", err);
      }
    };

    registerSW();

    // When the waiting SW activates, reload
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[PWA] Controller changed — reloading");
      window.location.reload();
    });

    return () => {
      swRegistration = null;
    };
  }, []);

  const toggleColorScheme = useCallback((value?: ColorScheme) => {
    const next = value || (colorScheme === "dark" ? "light" : "dark");
    setColorScheme(next);
    localStorage.setItem(COLOR_SCHEME_KEY, next);
  }, [colorScheme]);

  // 根据颜色方案动态更新 theme-color meta 标签，避免暗色模式下顶部亮色 bar
  useEffect(() => {
    const meta = document.getElementById("meta-theme-color");
    if (!meta) return;
    const themeColor = colorScheme === "dark" ? "#1a1815" : "#f5f0e9";
    meta.setAttribute("content", themeColor);
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
          <div className={`${playfair.variable} ${poppins.variable}`}>
            <Component {...pageProps} />
          </div>
        </I18nProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
