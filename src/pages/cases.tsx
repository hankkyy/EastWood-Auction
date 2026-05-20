import { AnimatedBox, Wrapper } from "@/layout";
import Head from "next/head";
import { CasesSection, HeroSection } from "@/section/Support";
import { fetchKnowledgeBase } from "@/features/image-search/artworkKnowledgeBase";
import type { Artwork } from "@/data/artworks";
import { GetStaticProps } from "next";

interface CasesPageProps {
  initialData: Artwork[];
}

export default function Support({ initialData }: CasesPageProps) {
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

// ✅ 使用 getStaticProps 在构建时预加载数据
export const getStaticProps: GetStaticProps<CasesPageProps> = async () => {
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
    console.error("Failed to fetch cases data:", error);
    return {
      props: {
        initialData: [],
      },
      revalidate: 60,
    };
  }
};