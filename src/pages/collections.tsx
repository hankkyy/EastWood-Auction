import { AnimatedBox, Wrapper } from "@/layout";
import { CollectionsSection, LinksSection } from "@/section/Collections";
import DonationSection from "@/section/shared/Donation";
import SupportSection from "@/section/shared/Support";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";
import { SEO } from "@/components/SEO";

interface CollectionsPageProps {
  initialData: Artwork[];
}

export default function Collections({ initialData }: CollectionsPageProps) {
  return (
    <>
      <SEO
        title="Collections"
        description="Explore the antique catalog — browse selected Chinese porcelain, jade, paintings, bronze, and scholar objects from Eastwood Auction."
      />
      <Wrapper>
        <AnimatedBox>
          <CollectionsSection initialData={initialData} />
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

export const getStaticProps: GetStaticProps<CollectionsPageProps> = async () => {
  try {
    const data = await fetchKnowledgeBaseServer();
    return {
      props: {
        initialData: data || [],
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to fetch collections data:", error);
    throw error;
  }
};
