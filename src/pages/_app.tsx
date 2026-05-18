import React from "react";
import type { AppProps } from "next/app";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/theme";
import { RouterTransition } from "@/components/RouterTransition";
import { I18nProvider } from "@/i18n";

import "@/styles/globals.css";

const config = {
  rules: [
    {
      id: "skip-link",
      enabled: true,
    },
  ],
};

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const ReactDOM = require("react-dom");
  const axe = require("@axe-core/react");
  axe(React, ReactDOM, 1000, config);
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={theme}>
      <I18nProvider>
        <RouterTransition />
        <Notifications position="top-right" />
        <Component {...pageProps} />
      </I18nProvider>
    </MantineProvider>
  );
}
