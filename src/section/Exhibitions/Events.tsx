import {
  Button,
  Center,
  Container,
  Flex,
  SimpleGrid,
  Title,
} from "@mantine/core";
import React from "react";
import EventsCard from "@/components/EventsCard";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const data = [
  ["events.cardOneTitle", "events.dateOngoing", "events.onlineType"],
  ["events.cardTwoTitle", "events.dateAugust16", "events.currentType"],
  ["events.cardThreeTitle", "events.dateAugust17October31", "events.onlineType"],
  ["events.cardFourTitle", "events.dateAugust15October31", "events.currentType"],
  ["events.cardFiveTitle", "events.dateAugust15October31", "events.currentType"],
  ["events.cardSixTitle", "events.dateAugust15October31", "events.currentType"],
] as const;

const images = [
  "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1559494007-9f5847c49d94?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1608481337062-4093bf3ed404?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507272931001-fc06c17e4f43?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1510798831971-661eb04b3739?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1582721478779-0ae163c05a60?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&q=80",
] as const;

export default function EventsSection() {
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  return (
    <Container fluid pt={80} pb={120}>
      <Flex mb="xl" align="center" justify="space-between">
        <Title size={smallerThan ? 32 : 48}>{t("exhibitions.specialTitle")}</Title>
        <Button variant="light">{t("exhibitions.browseAll")}</Button>
      </Flex>
      <SimpleGrid
        cols={3}
        spacing="lg"
        breakpoints={[
          { maxWidth: "md", cols: 2, spacing: "md" },
          { maxWidth: "sm", cols: 1, spacing: "sm" },
        ]}
      >
        {data.map(([titleKey, dateKey, typeKey], index) => (
          <EventsCard
            item={{
              image: images[index],
              title: t(titleKey),
              date: t(dateKey),
              type: t(typeKey),
              description: t("events.description"),
            }}
            key={`event-title-${titleKey}`}
          />
        ))}
      </SimpleGrid>
      <Center mt={smallerThan ? 36 : "xl"}>
        <Button size="lg" variant="outline" fullWidth={smallerThan}>
          {t("exhibitions.loadMore")}
        </Button>
      </Center>
    </Container>
  );
}
