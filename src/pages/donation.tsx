import { AnimatedBox, Wrapper } from "@/layout";
import Head from "next/head";
import { FaqsSection, HeroSection, InfoSection } from "@/section/Donation";

export default function Donation() {
  return (
    <>
      <Head>
        <title>Eastwood Auction - Donation</title>
      </Head>
      <Wrapper>
        <HeroSection />
        <AnimatedBox>
          <InfoSection />
        </AnimatedBox>
        <AnimatedBox>
          <FaqsSection />
        </AnimatedBox>
      </Wrapper>
    </>
  );
}
