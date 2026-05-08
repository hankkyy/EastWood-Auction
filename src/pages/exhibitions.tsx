import Head from "next/head";
import { AnimatedBox, Wrapper } from "@/layout";
import HeroSection from "@/section/Exhibitions/Hero";
import EventsSection from "@/section/Exhibitions/Events";
import CarouselEventsSection from "@/section/shared/CarouselEvents";
import SupportSection from "@/section/shared/Support";
import { useI18n } from "@/i18n";

export default function Exhibitions() {
  const { t } = useI18n();

  return (
    <>
      <Head>
        <title>Eastwood Auction - Exhibitions</title>
      </Head>
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
