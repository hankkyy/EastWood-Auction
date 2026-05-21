import { useRouter } from "next/router";
import {
  Box,
  Button,
  ButtonProps,
  Center,
  Container,
  createStyles,
  Divider,
  Grid,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.violet[0],

    "&:hover, &:focus": {
      transition: "all ease 200ms",
    },
  },
}));

export default function DiscoverSection() {
  const router = useRouter();
  const { classes } = useStyles();
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  const buttonProps: ButtonProps = {
    variant: "outline",
    fullWidth: smallerThan,
  };

  const handleDiscoverMore = () => {
    router.push("/shop");
  };

  return (
    <Container fluid pt={80} pb={120}>
      <Box mb="xl" sx={{ textAlign: "center" }}>
        <Title size={48} mb="md">
          {t("home.discoverTitle")}
        </Title>
        <Text size="lg">{t("home.discoverSubtitle")}</Text>
      </Box>
      <Paper className={classes.card} p={smallerThan ? 8 : 6}>
        <Grid sx={{ alignItems: "center" }}>
          <Grid.Col lg={6} p={0}>
            <Image
              src="https://images.unsplash.com/photo-1610494940231-a07875fb25fc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
              alt=""
              height={smallerThan ? 320 : 420}
              fit="cover"
              radius="sm"
            />
          </Grid.Col>
          <Grid.Col lg={6} p={0}>
            <Stack align="start" p={smallerThan ? "md" : "lg"}>
              <Title size={24}>{t("home.discoverFeatureTitle")}</Title>
              <Text>
                {t("home.discoverFeatureP1")}
              </Text>
              <Text>
                {t("home.discoverFeatureP2")}
              </Text>
              <Text>
                {t("home.discoverFeatureP3")}
              </Text>
              <Button 
                {...buttonProps} 
                size={smallerThan ? "sm" : "md"}
                onClick={handleDiscoverMore}
              >
                {t("home.continueReading")}
              </Button>
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>
      {!smallerThan && <Divider my="xl" />}
      <SimpleGrid
        cols={4}
        mt="xl"
        breakpoints={[
          { maxWidth: "lg", cols: 2, spacing: "lg" },
          { maxWidth: "md", cols: 1, spacing: "md" },
          { maxWidth: "sm", cols: 1, spacing: "sm" },
        ]}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={`news-item-${i}`} className={classes.card} p="md">
            <Text size="lg" weight={600} mb="md">
              {t("home.newsTitle")}
            </Text>
            <Text mb="md">
              {t("home.newsText")}
            </Text>
            <Button 
              {...buttonProps}
              onClick={handleDiscoverMore}
            >
              {t("home.readMore")}
            </Button>
          </Paper>
        ))}
      </SimpleGrid>
      <Center mt={smallerThan ? 36 : "xl"}>
        <Button 
          size="xl" 
          variant="outline" 
          fullWidth={smallerThan}
          onClick={handleDiscoverMore}
        >
          {t("home.discoverMore")}
        </Button>
      </Center>
    </Container>
  );
}
