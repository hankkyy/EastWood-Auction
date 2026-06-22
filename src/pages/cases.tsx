import { AnimatedBox, Wrapper } from "@/layout";
import HeroSection from "@/section/Support/Hero";
import CasesSection from "@/section/Support/Cases";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";
import { SEO } from "@/components/SEO";

interface CasesPageProps {
  initialData: Artwork[];
}

export default function Support({ initialData }: CasesPageProps) {
  return (
    <>
      <SEO
        title="Return Cases"
        description="Return case archive — browse completed transaction records, sale price histories, and risk-avoidance advice from Eastwood Auction."
      />
      <Wrapper>
        <HeroSection />
        <AnimatedBox>
          <CasesSection initialData={initialData} />
        </AnimatedBox>
      </Wrapper>
    </>
  );
}

export const getStaticProps: GetStaticProps<CasesPageProps> = async () => {
  try {
    const data = await fetchKnowledgeBaseServer();
    return {
      props: {
        initialData: data || [],
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to fetch cases data:", error);
    throw error;
  }
};
