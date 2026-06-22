import { AnimatedBox, Wrapper } from "@/layout";
import { CollectionsSection, LinksSection } from "@/section/Collections";
import DonationSection from "@/section/shared/Donation";
import SupportSection from "@/section/shared/Support";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";
import { SEO } from "@/components/SEO";

interface ShopPageProps {
  initialData: Artwork[];
}

export default function Shop({ initialData }: ShopPageProps) {
  return (
    <>
      <SEO
        title="Antique Shop"
        description="Browse available antiques, decorative objects, and collectible works online. Shop Chinese porcelain, jade, paintings, and bronze artifacts from Eastwood Auction."
      />
      <Wrapper>
        <AnimatedBox>
          <CollectionsSection initialData={initialData} shopMode={true} />
        </AnimatedBox>
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

export const getStaticProps: GetStaticProps<ShopPageProps> = async () => {
  try {
    const data = await fetchKnowledgeBaseServer();
    return {
      props: {
        initialData: data || [],
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to fetch shop data:", error);
    throw error;
  }
};
