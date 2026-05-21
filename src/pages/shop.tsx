import Head from "next/head";
import { AnimatedBox, Wrapper } from "@/layout";
import { CollectionsSection, LinksSection } from "@/section/Collections";
import DonationSection from "@/section/shared/Donation";
import SupportSection from "@/section/shared/Support";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";

interface ShopPageProps {
  initialData: Artwork[];
}

export default function Shop({ initialData }: ShopPageProps) {
  return (
    <>
      <Head>
        <title>Eastwood Auction - Antique Shop</title>
      </Head>
      <Wrapper>
        {/* Primary catalog content is server-prefetched, then hydrated on the client. */}
        <AnimatedBox>
          <CollectionsSection initialData={initialData} shopMode={true} />
        </AnimatedBox>
        {/* Secondary conversion-focused blocks are kept below the product listing. */}
        <AnimatedBox>
          <LinksSection />
        </AnimatedBox>
        <DonationSection />
        <AnimatedBox>
          <SupportSection />
        </AnimatedBox>
      </Wrapper>
    </>
  );
}

// Pre-render the shop page with server-side artwork data.
export const getStaticProps: GetStaticProps<ShopPageProps> = async () => {
  try {
    const data = await fetchKnowledgeBaseServer();

    return {
      props: {
        initialData: data || [],
      },
      // Keep inventory reasonably fresh without paying per-request SSR cost.
      revalidate: 60,
    };
  } catch (error) {
    // Surface build-time/data-source failures early instead of silently serving empty pages.
    console.error("Failed to fetch shop data:", error);
    throw error;
  }
};
