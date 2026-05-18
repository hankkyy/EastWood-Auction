import { AnimatedBox, Wrapper } from "@/layout";
import Head from "next/head";
import { CasesSection, HeroSection } from "@/section/Support";

export default function Support() {
  return (
    <>
      <Head>
        <title>Eastwood Auction - Return Cases</title>
      </Head>
      <Wrapper>
        <HeroSection />
        <AnimatedBox>
          <CasesSection />
        </AnimatedBox>
      </Wrapper>
    </>
  );
}