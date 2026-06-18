import {
  Button,
  Center,
  Container,
  List,
  Paper,
  PaperProps,
  Stack,
  Text,
  Title,
  TitleProps,
  useMantineTheme,
} from "@mantine/core";
import React from "react";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const { Item } = List;

export default function WelcomeSection() {
  const theme = useMantineTheme();
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

  const paperProps: PaperProps = {
    p: "lg",
    sx: {
      background:
        theme.colorScheme === "dark"
          ? "linear-gradient(175deg, #2a2620 0%, #25221d 40%, #1f1c17 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 6px)"
          : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)",
      boxShadow:
        theme.colorScheme === "dark"
          ? "0 1px 3px rgba(0,0,0,0.20), 0 6px 20px rgba(0,0,0,0.22)"
          : "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)",
      borderRadius: 16,
      border:
        theme.colorScheme === "dark"
          ? "1px solid rgba(196, 162, 85, 0.10)"
          : "1px solid rgba(180, 158, 120, 0.15)",
    },
  };

  const titleProps: TitleProps = {
    order: 3,
    mb: "md",
  };

  return (
    <Container pt={80} pb={120}>
      <Stack spacing="lg">
        <Paper {...paperProps}>
          <Title {...titleProps}>{t("visit.hoursTitle")}</Title>
          <List>
            <Item>{t("visit.hoursTue")}</Item>
            <Item>{t("visit.hoursThu")}</Item>
            <Item>{t("visit.hoursClosed")}</Item>
          </List>
        </Paper>
        <Paper {...paperProps}>
          <Title {...titleProps}>{t("visit.ticketingTitle")}</Title>
          <List>
            <Item>{t("visit.ticketingRecommended")}</Item>
            <Item>{t("visit.ticketingHours")}</Item>
            <Item>{t("visit.ticketingAdmission")}</Item>
            <Item>{t("visit.ticketingReleased")}</Item>
          </List>
        </Paper>
        <Paper {...paperProps}>
          <Title {...titleProps}>{t("visit.beforeTitle")}</Title>
          <List>
            <Item>{t("visit.beforeTicket")}</Item>
            <Item>{t("visit.beforeMasks")}</Item>
            <Item>{t("visit.beforeSymptoms")}</Item>
          </List>
        </Paper>
        <Paper {...paperProps}>
          <Title {...titleProps}>{t("visit.arriveTitle")}</Title>
          <List>
            <Item>{t("visit.arriveScan")}</Item>
            <Item>{t("visit.arriveMasks")}</Item>
            <Item>{t("visit.arriveSick")}</Item>
          </List>
        </Paper>
        <Paper {...paperProps}>
          <Title {...titleProps}>{t("visit.policiesTitle")}</Title>
          <List>
            <Item>{t("visit.policyMasks")}</Item>
            <Item>{t("visit.policyFood")}</Item>
            <Item>{t("visit.policyLockers")}</Item>
            <Item>{t("visit.policyBags")}</Item>
            <Item>{t("visit.policyAnimals")}</Item>
          </List>
        </Paper>
        <Text>{t("visit.healthNote")}</Text>
        <Text>{t("visit.infoNote")}</Text>
        <Text>{t("visit.galleryNote")}</Text>
        <Text>{t("visit.welcomeNote")}</Text>
        <Center mt={smallerThan ? 16 : "xl"}>
          <Button size="lg" fullWidth={smallerThan}>
            {t("visit.getTickets")}
          </Button>
        </Center>
      </Stack>
    </Container>
  );
}
