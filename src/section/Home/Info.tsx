import React from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Container,
  createStyles,
  Flex,
  Grid,
  Image,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconShieldCheck, IconMessageCircle, IconTruck } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import {
  artworkCardShellBackground,
  cardTextureOverlay,
  cardBorder,
} from "@/components/artworkStyles";

const { Col } = Grid;

const useStyles = createStyles((theme) => ({
  card: {
    minHeight: 142,
    background: `${artworkCardShellBackground(theme)}, ${cardTextureOverlay(theme)}`,
    border: cardBorder(theme),
    padding: theme.spacing.md,
    display: "flex",
    alignItems: "center",
    boxShadow: theme.colorScheme === "dark"
      ? "0 2px 4px rgba(0,0,0,0.20), 0 12px 24px rgba(0,0,0,0.22)"
      : "0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.04)",
    borderRadius: 2,
  },
}));

export default function InfoSection() {
  const { classes } = useStyles();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();
  const router = useRouter();

  const iconSize = smallerThan ? 32 : 48;

  return (
    <Container pt={80} pb={120}>
      <Title mb="xl" size={smallerThan ? 32 : 48} align="center">
        {t("home.infoTitle")}
      </Title>
      <Grid>
        <Col md={6} lg={7}>
          <Image
            src="https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=735&q=80"
            alt=""
            height={smallerThan ? 320 : 500}
            fit="cover"
            radius={2}
          />
        </Col>
        <Col md={6} lg={5}>
          <Stack>
            <Paper className={classes.card}>
              <Flex gap="md">
                <Box sx={{ width: iconSize, height: iconSize, color: "#c4a255" }}>
                  <IconShieldCheck size={iconSize} />
                </Box>
                <Stack spacing="sm">
                  <Text size="lg" weight={400}>
                    {t("home.featureAuthTitle")}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {t("home.featureAuthDesc")}
                  </Text>
                </Stack>
              </Flex>
            </Paper>
            <Paper className={classes.card}>
              <Flex gap="md">
                <Box sx={{ width: iconSize, height: iconSize, color: "#c4a255" }}>
                  <IconMessageCircle size={iconSize} />
                </Box>
                <Stack spacing="sm" align="flex-start">
                  <Text size="lg" weight={400}>
                    {t("home.featureConsignTitle")}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {t("home.featureConsignDesc")}
                  </Text>
                  <Button
                    size="md"
                    fullWidth={smallerThan}
                    variant="outline"
                    onClick={() => router.push("/inquiries")}
                  >
                    {t("home.bookButton")}
                  </Button>
                </Stack>
              </Flex>
            </Paper>
            <Paper className={classes.card}>
              <Flex gap="md">
                <Box sx={{ width: iconSize, height: iconSize, color: "#c4a255" }}>
                  <IconTruck size={iconSize} />
                </Box>
                <Stack spacing="sm">
                  <Text size="lg" weight={400}>
                    {t("home.featureShippingTitle")}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {t("home.featureShippingDesc")}
                  </Text>
                </Stack>
              </Flex>
            </Paper>
          </Stack>
        </Col>
      </Grid>
    </Container>
  );
}
