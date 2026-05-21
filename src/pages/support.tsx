import { AnimatedBox, Wrapper } from "@/layout";
import Head from "next/head";
import { CasesSection, HeroSection } from "@/section/Support";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";

interface SupportPageProps {
  initialData: Artwork[];
}

export default function Support({ initialData }: SupportPageProps) {
  return (
    <>
      <Head>
        <title>Eastwood Auction - Return Cases</title>
      </Head>
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
    throw error;
  }
};
