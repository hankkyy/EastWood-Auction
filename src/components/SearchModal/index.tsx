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
import { useRouter } from "next/router";
import React, { useCallback, useState } from "react";
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
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    close();
    void router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, close, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const paperProps: PaperProps = {
    p: "md",
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
                    <Text size="sm" color="dimmed">
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
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              size="lg"
              sx={{ width: "fit-content" }}
              onClick={handleSubmit}
            >
              {t("search.submit")}
            </Button>
          </Stack>
        </Center>
      </Container>
    </Modal>
  );
}
