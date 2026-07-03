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
        {/* 默认 black（黑底白字），_app.tsx 会在暗色模式下保持，亮色模式下改为 default */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black" id="ios-status-bar-style" />
        <meta name="apple-mobile-web-app-title" content="Eastwood" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* iOS PWA 启动画面 — 使用现有 icon-512 作为 splash image */}
        <link
          rel="apple-touch-startup-image"
          href="/icon-512.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icon-512.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icon-512.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icon-512.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = getInitialProps;
