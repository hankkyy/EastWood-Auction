import { AnimatedBox, Wrapper } from "@/layout";
import { FaqsSection, HeroSection, InfoSection } from "@/section/Donation";
import { SEO } from "@/components/SEO";

export default function Donation() {
  return (
    <>
      <SEO
        title="Consignment"
        description="Consign your antiques with Eastwood Auction. Expert cataloging, presentation, and buyer matching for Chinese porcelain, jade, paintings, and fine art."
      />
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
