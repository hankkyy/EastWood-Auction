import React from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Container,
  Image,
  Paper,
  SimpleGrid,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import { appMutedTextColor, primaryActionButtonSx, secondaryActionButtonSx } from "@/components/artworkStyles";

const data = [
  {
    image:
      "https://images.unsplash.com/photo-1583306346437-f2143c0f11fc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80",
    titleKey: "home.visitCardOneTitle",
    textKey: "home.visitCardText",
  },
  {
    image:
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1172&q=80",
    titleKey: "home.visitCardTwoTitle",
    textKey: "home.visitCardText",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600066975936-ecc81000c8b6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1644&q=80",
    titleKey: "home.visitCardThreeTitle",
    textKey: "home.visitCardText",
  },
] as const;

export default function VisitSection() {
  const router = useRouter();
  const theme = useMantineTheme();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  const handleLearnMore = (index: number) => {
    if (index === 0) router.push("/shop");
    else if (index === 1) router.push("/inquiries");
    else if (index === 2) router.push("/search");
  };

  return (
    <Container fluid pt={80} pb={120}>
      <Box sx={{ maxWidth: 760, margin: "0 auto 48px" }}>
        <Title size={smallerThan ? 32 : 48} align="center" mb="md">
          {t("home.visitTitle")}
        </Title>
        <Text size="lg" align="center" sx={(theme) => ({ color: appMutedTextColor(theme), lineHeight: 1.8 })}>
          {t("home.visitSubtitle")}
        </Text>
      </Box>
      <SimpleGrid
        cols={3}
        spacing="lg"
        breakpoints={[
          { maxWidth: "md", cols: 1, spacing: "md" },
          { maxWidth: "sm", cols: 1, spacing: "sm" },
        ]}
      >
        {data.map((item, i) => (
          <Paper
            key={`visit-item-${i}`}
            sx={(theme) => ({
              background: theme.colorScheme === "dark"
                ? "linear-gradient(175deg, #2a2620 0%, #25221d 40%, #1f1c17 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 6px)"
                : "linear-gradient(175deg, #fbf8f2 0%, #f7f2e9 40%, #f2e9d8 100%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,119,80,0.025) 3px, rgba(139,119,80,0.025) 6px)",
              boxShadow: theme.colorScheme === "dark"
                ? "0 1px 3px rgba(0,0,0,0.20), 0 6px 20px rgba(0,0,0,0.22)"
                : "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)",
              borderRadius: 16,
              border: theme.colorScheme === "dark"
                ? "1px solid rgba(196, 162, 85, 0.10)"
                : "1px solid rgba(180, 158, 120, 0.15)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
              "&:hover": {
                transform: "translateY(-4px)",
                borderColor: "#c4a255",
                boxShadow: theme.colorScheme === "dark"
                  ? "0 6px 20px rgba(0,0,0,0.26)"
                  : "0 8px 22px rgba(0,0,0,0.08)",
              },
            })}
          >
            <Image src={item.image} alt={t(item.titleKey)} height={320} radius="sm" />
            <Box
              p={smallerThan ? "md" : "lg"}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Text size="xl" weight={600} pt="sm">
                {t(item.titleKey)}
              </Text>
              <Text my="sm" sx={(theme) => ({ flex: 1, color: appMutedTextColor(theme), lineHeight: 1.75 })}>
                {t(item.textKey)}
              </Text>
              <Button 
                variant="outline"
                fullWidth={smallerThan}
                onClick={() => handleLearnMore(i)}
                sx={(theme) => secondaryActionButtonSx(theme)}
              >
                {t("visit.learnMore")}
              </Button>
            </Box>
          </Paper>
        ))}
      </SimpleGrid>
    </Container>
  );
}
