import { AnimatedBox, Wrapper } from "@/layout";
import HeroSection from "@/section/Exhibitions/Hero";
import EventsSection from "@/section/Exhibitions/Events";
import CarouselEventsSection from "@/section/shared/CarouselEvents";
import SupportSection from "@/section/shared/Support";
import { useI18n } from "@/i18n";
import { SEO } from "@/components/SEO";

export default function Exhibitions() {
  const { t } = useI18n();

  return (
    <>
      <SEO
        title="Exhibitions"
        description="Explore Eastwood Auction's featured antique exhibitions — browse auction previews, upcoming lots, and online catalogs of Chinese porcelain, jade, and fine art."
      />
      <Wrapper>
        <HeroSection />
        <AnimatedBox>
          <EventsSection />
        </AnimatedBox>
        <AnimatedBox>
          <CarouselEventsSection title={t("exhibitions.onlineTitle")} />
        </AnimatedBox>
        <AnimatedBox>
          <SupportSection />
        </AnimatedBox>
      </Wrapper>
    </>
  );
}
