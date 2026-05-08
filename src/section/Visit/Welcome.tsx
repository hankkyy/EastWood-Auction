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
    withBorder: true,
    p: "lg",
    sx: {
      backgroundColor: theme.colors.violet[0],
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
