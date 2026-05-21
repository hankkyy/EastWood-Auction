import Head from "next/head";
import { AnimatedBox, Wrapper } from "@/layout";
import { CollectionsSection, LinksSection } from "@/section/Collections";
import DonationSection from "@/section/shared/Donation";
import SupportSection from "@/section/shared/Support";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";

interface CollectionsPageProps {
  initialData: Artwork[];
}

export default function Collections({ initialData }: CollectionsPageProps) {
  return (
    <>
      <Head>
        <title>Eastwood Auction - Collections</title>
      </Head>
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

// ✅ 使用 getStaticProps 在构建时预加载数据
export const getStaticProps: GetStaticProps<CollectionsPageProps> = async () => {
  try {
    const data = await fetchKnowledgeBaseServer();
    
    return {
      props: {
        initialData: data || [],
      },
      // ✅ 每 60 秒重新生成页面（增量静态再生）
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to fetch collections data:", error);
    throw error;
  }
};
