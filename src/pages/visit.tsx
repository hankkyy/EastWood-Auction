import { AnimatedBox, Wrapper } from "@/layout";
import HeroSection from "@/section/Visit/Hero";
import WelcomeSection from "@/section/Visit/Welcome";
import FeaturesSection from "@/section/Visit/Features";
import DonationSection from "@/section/shared/Donation";
import FaqsSection from "@/section/shared/Faqs";
import SupportSection from "@/section/shared/Support";
import AccessibilitySection from "@/section/Visit/Accessibility";
import FacilitiesSection from "@/section/Visit/Facilities";
import CarouselEventsSection from "@/section/shared/CarouselEvents";
import { SEO } from "@/components/SEO";

export default function Visit() {
  return (
    <>
      <SEO
        title="Visit"
        description="Browse and inquire about antique highlights, request item details, and follow upcoming auction previews at Eastwood Auction. Online catalog available 24/7."
      />
      <Wrapper>
        <HeroSection />
        <AnimatedBox>
          <WelcomeSection />
        </AnimatedBox>
        <AnimatedBox>
          <FeaturesSection />
        </AnimatedBox>
        <DonationSection />
        <AnimatedBox>
          <CarouselEventsSection />
        </AnimatedBox>
        <AnimatedBox>
          <SupportSection />
        </AnimatedBox>
        <AnimatedBox>
          <AccessibilitySection />
        </AnimatedBox>
        <AnimatedBox>
          <FacilitiesSection />
        </AnimatedBox>
        <AnimatedBox>
          <FaqsSection />
        </AnimatedBox>
      </Wrapper>
    </>
  );
}
