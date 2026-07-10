import Head from "next/head";
import { useRouter } from "next/router";
import { useI18n } from "@/i18n";

export interface SEOProps {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
}

const SITE_NAME = "Eastwood Auction";
const BASE_URL = "https://eastwoodauction.com";
const DEFAULT_IMAGE = "/eastwood-logo.png";

export function SEO({ title, description, image, noindex }: SEOProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
  const ogImage = image || DEFAULT_IMAGE;
  const absoluteImage = ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`;
  const canonical = `${BASE_URL}${router.asPath.split("?")[0]}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="zh_CN" />
      <meta property="og:locale:alternate" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
    </Head>
  );
}
