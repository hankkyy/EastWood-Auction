import {
  Button,
  Center,
  Container,
  createStyles,
  Flex,
  Modal,
  Paper,
  PaperProps,
  rem,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  TextProps,
} from "@mantine/core";
import {
  IconCalendarTime,
  IconPhotoSearch,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import React from "react";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  link: {
    "&:hover, &:focus": {
      textDecoration: "underline",
      cursor: "pointer",
    },
  },
  imageSearchCard: {
    border: `1px solid rgba(216, 183, 109, 0.22)`,
    background:
      "linear-gradient(135deg, rgba(32, 38, 46, 0.96), rgba(20, 25, 31, 0.96))",
  },
}));

interface IProps {
  opened: boolean;
  close: () => void;
}

export default function SearchModal({ opened, close }: IProps) {
  const { classes, theme } = useStyles();
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

  const paperProps: PaperProps = {
    p: "md",
    sx: {
      backgroundColor: theme.colors.violet[0],
    },
  };

  const titleTextProps: TextProps = {
    size: "md",
    weight: 500,
    mb: "md",
    className: classes.link,
  };

  const textProps: TextProps = {
    size: "sm",
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={t("search.title")}
      fullScreen
      transitionProps={{ transition: "fade", duration: 200 }}
    >
      <Container px={0}>
        <Center sx={{ height: rem(600) }}>
          <Stack spacing="xl">
            <Paper p="lg" className={classes.imageSearchCard}>
              <Flex
                gap="md"
                align={smallerThan ? "flex-start" : "center"}
                justify="space-between"
                direction={smallerThan ? "column" : "row"}
              >
                <Flex gap="md" align="center">
                  <IconPhotoSearch size={32} color={theme.colors.violet[7]} />
                  <div>
                    <Text size="lg" weight={700}>
                      {t("search.imageTitle")}
                    </Text>
                    <Text size="sm" color="dark.1">
                      {t("search.imageDescription")}
                    </Text>
                  </div>
                </Flex>
                <Button
                  component={Link}
                  href="/image-search"
                  onClick={close}
                  leftIcon={<IconPhotoSearch size={18} />}
                  fullWidth={smallerThan}
                >
                  {t("search.openImageSearch")}
                </Button>
              </Flex>
            </Paper>

            <Text size="lg" transform="uppercase">
              {t("search.events")}
            </Text>
            <TextInput
              size="lg"
              placeholder={t("search.placeholder")}
              icon={<IconSearch size={18} />}
              aria-label={t("search.events")}
            />
            <Button size="lg" sx={{ width: "fit-content" }}>
              {t("search.submit")}
            </Button>
            <SimpleGrid
              cols={3}
              spacing="lg"
              breakpoints={[
                { maxWidth: "md", cols: 1, spacing: "md" },
                { maxWidth: "sm", cols: 1, spacing: "sm" },
                { maxWidth: "xs", cols: 1, spacing: "sm" },
              ]}
            >
              <Paper {...paperProps}>
                <Text {...titleTextProps}>
                  Best forests to visit in North America
                </Text>
                <Flex gap="xs" align="center">
                  <IconCalendarTime size={14} />
                  <Text {...textProps}>{t("search.ongoing")}</Text>
                </Flex>
              </Paper>
              <Paper {...paperProps}>
                <Text {...titleTextProps}>
                  Hawaii beaches review: better than you think
                </Text>
                <Flex gap="xs" align="center">
                  <IconCalendarTime size={14} />
                  <Text {...textProps}>16 August</Text>
                </Flex>
              </Paper>
              <Paper {...paperProps}>
                <Text {...titleTextProps}>
                  Mountains at night: 12 best locations to enjoy the view
                </Text>
                <Flex gap="xs" align="center">
                  <IconCalendarTime size={14} />
                  <Text {...textProps}>17 August – 31 October</Text>
                </Flex>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Center>
      </Container>
    </Modal>
  );
}
