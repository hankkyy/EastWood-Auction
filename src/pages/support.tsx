import { AnimatedBox, Wrapper } from "@/layout";
import { CasesSection, HeroSection } from "@/section/Support";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";
import { SEO } from "@/components/SEO";

interface SupportPageProps {
  initialData: Artwork[];
}

export default function Support({ initialData }: SupportPageProps) {
  return (
    <>
      <SEO
        title="Support"
        description="Auction services for collectors, consignors, and buyers. Catalog and document antique items, connect buyers with relevant item information from Eastwood Auction."
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

export const getStaticProps: GetStaticProps<SupportPageProps> = async () => {
  try {
    const data = await fetchKnowledgeBaseServer();
    return {
      props: {
        initialData: data || [],
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to fetch support data:", error);
    return { props: { initialData: [] }, revalidate: 60 };
  }
};
