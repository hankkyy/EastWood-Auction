import {
  ActionIcon,
  ActionIconProps,
  Button,
  Center,
  Container,
  createStyles,
  Flex,
  Progress,
  rem,
  Title,
} from "@mantine/core";
import { Carousel, Embla } from "@mantine/carousel";
import React, { useCallback, useEffect, useState } from "react";
import { IconArrowLeftBar, IconArrowRightBar } from "@tabler/icons-react";
import EventsCard from "@/components/EventsCard";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const data = [
  {
    image:
      "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
    titleKey: "events.cardOneTitle",
    dateKey: "events.dateOngoing",
    typeKey: "events.onlineType",
    descriptionKey: "events.description",
  },
  {
    image:
      "https://images.unsplash.com/photo-1559494007-9f5847c49d94?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
    titleKey: "events.cardTwoTitle",
    dateKey: "events.dateAugust16",
    typeKey: "events.currentType",
    descriptionKey: "events.description",
  },
  {
    image:
      "https://images.unsplash.com/photo-1608481337062-4093bf3ed404?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
    titleKey: "events.cardThreeTitle",
    dateKey: "events.dateAugust17October31",
    typeKey: "events.onlineType",
    descriptionKey: "events.description",
  },
  {
    image:
      "https://images.unsplash.com/photo-1507272931001-fc06c17e4f43?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
    titleKey: "events.cardFourTitle",
    dateKey: "events.dateAugust15October31",
    typeKey: "events.currentType",
    descriptionKey: "events.description",
  },
  {
    image:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
    titleKey: "events.cardFiveTitle",
    dateKey: "events.dateAugust15October31",
    typeKey: "events.currentType",
    descriptionKey: "events.description",
  },
  {
    image:
      "https://images.unsplash.com/photo-1582721478779-0ae163c05a60?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
    titleKey: "events.cardSixTitle",
    dateKey: "events.dateAugust15October31",
    typeKey: "events.currentType",
    descriptionKey: "events.description",
  },
] as const;

const useStyles = createStyles(() => ({
  link: {
    "&:hover, &:focus": {
      textDecoration: "underline",
      cursor: "pointer",
    },
  },
}));

interface IProps {
  title?: string;
}

export default function CarouselEventsSection({ title }: IProps) {
  useStyles();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [embla, setEmbla] = useState<Embla | null>(null);
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  const actionIconProps: ActionIconProps = {
    size: "xl",
    variant: "subtle",
    color: "violet",
  };

  const handleScroll = useCallback(() => {
    if (!embla) return;
    const progress = Math.max(0, Math.min(1, embla.scrollProgress()));
    setScrollProgress(progress * 100);
  }, [embla, setScrollProgress]);

  const handleNext = () => {
    embla?.scrollNext();
  };

  const handlePrevious = () => {
    embla?.scrollPrev();
  };

  useEffect(() => {
    if (embla) {
      embla.on("scroll", handleScroll);
      handleScroll();
    }
  }, [embla, handleScroll]);

  const slides = data.map((item, i) => (
    <Carousel.Slide key={`event-item-${i}`}>
      <EventsCard
        item={{
          image: item.image,
          title: t(item.titleKey),
          type: t(item.typeKey),
          date: t(item.dateKey),
          description: t(item.descriptionKey),
        }}
      />
    </Carousel.Slide>
  ));

  return (
    <Container fluid pt={80} pb={120} sx={{ overflow: "hidden" }}>
      <Flex justify="space-between" align={smallerThan ? "flex-end" : "center"}>
        <Title size={smallerThan ? 32 : 48}>{title ?? t("events.title")}</Title>
        <Flex gap="md">
          <ActionIcon
            onClick={handlePrevious}
            title={t("events.previous")}
            {...actionIconProps}
          >
            <IconArrowLeftBar />
          </ActionIcon>
          <ActionIcon
            onClick={handleNext}
            title={t("events.next")}
            {...actionIconProps}
          >
            <IconArrowRightBar />
          </ActionIcon>
        </Flex>
      </Flex>
      <Progress
        value={scrollProgress}
        styles={{
          bar: { transitionDuration: "0ms" },
          root: { maxWidth: "100%" },
        }}
        size="xs"
        mx="auto"
        my="lg"
        aria-label={t("events.progress")}
        {...{
          "aria-labelledby": t("events.progress"),
          id: "eventProgressBar",
          title: t("events.progress"),
        }}
      />
      <Carousel
        slideSize="33%"
        breakpoints={[
          { maxWidth: "md", slideSize: "50%" },
          { maxWidth: "sm", slideSize: "100%", slideGap: rem(2) },
        ]}
        slideGap="md"
        align="start"
        slidesToScroll={1}
        loop
        dragFree
        getEmblaApi={setEmbla}
        withControls={false}
      >
        {slides}
      </Carousel>
      <Center mt={smallerThan ? 36 : "xl"}>
        <Button size="lg" variant="outline" fullWidth={smallerThan}>
          {t("events.viewAll")}
        </Button>
      </Center>
    </Container>
  );
}
