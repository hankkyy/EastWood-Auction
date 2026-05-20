import Head from "next/head";
import { AnimatedBox, Wrapper } from "@/layout";
import { CollectionsSection, LinksSection } from "@/section/Collections";
import DonationSection from "@/section/shared/Donation";
import SupportSection from "@/section/shared/Support";
import { fetchKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
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

// ✅ 使用 getStaticProps 在构建时预加载数据
export const getStaticProps: GetStaticProps<ShopPageProps> = async () => {
  try {
    // 在服务端获取数据
    const data = await fetchKnowledgeBase();
    
    return {
      props: {
        initialData: data || [],
      },
      // ✅ 每 60 秒重新生成页面（增量静态再生）
      revalidate: 60,
    };
  } catch (error) {
    console.error("Failed to fetch shop data:", error);
    return {
      props: {
        initialData: [],
      },
      revalidate: 60,
    };
  }
};
