import { Html, Head, Main, NextScript } from "next/document";
import { createGetInitialProps } from "@mantine/next";

const getInitialProps = createGetInitialProps();

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* Favicon — only declare here, not in individual pages */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Playfair Display is now self-hosted via next/font in _app.tsx — no external Google Fonts request */}

        {/* PWA — Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* PWA — iOS & Android */}
        {/* theme-color 由 _app.tsx 根据暗色/亮色模式动态设置 */}
        <meta name="theme-color" content="#f5f0e9" id="meta-theme-color" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Eastwood" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = getInitialProps;
