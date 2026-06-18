import {
  BackgroundImage,
  Box,
  Button,
  Center,
  Container,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

export default function DonationSection() {
  const smallerThan = useMediaQuery("(max-width: 600px)");
  const { t } = useI18n();

  return (
    <Box pt={80} pb={120}>
      <Box sx={{ height: 560 }}>
        <BackgroundImage
          src="https://images.unsplash.com/photo-1572953109213-3be62398eb95?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
          radius={0}
          sx={{
            height: "100%",
            backgroundAttachment: "fixed",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        >
          <Stack justify="center" sx={{ height: "100%" }}>
            <Container>
              <Paper
                p="xl"
                sx={(theme) => ({
                  backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[1] : "#fff",
                  color: theme.colorScheme === "dark" ? theme.colors.dark[9] : theme.colors.dark[0],
                })}
              >
                <Title align={smallerThan ? "center" : "start"}>
                  {t("sharedDonation.title")}
                </Title>
                <Text my="sm">
                  {t("sharedDonation.description")}
                </Text>
                <Center>
                  <Button size="md" fullWidth={smallerThan}>
                    {t("sharedDonation.button")}
                  </Button>
                </Center>
              </Paper>
            </Container>
          </Stack>
        </BackgroundImage>
      </Box>
    </Box>
  );
}
