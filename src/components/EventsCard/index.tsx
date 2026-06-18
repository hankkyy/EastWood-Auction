import {
  Badge,
  Box,
  ButtonProps,
  createStyles,
  Flex,
  Group,
  Image,
  Paper,
  Spoiler,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconCalendarTime,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import React from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n";
import {
  artworkCardShellBackground,
  cardTextureOverlay,
  cardShadow,
  cardShadowHover,
  cardInnerRim,
  cardBorder,
  cardBorderHover,
} from "@/components/artworkStyles";

const useStyles = createStyles((theme) => ({
  card: {
    background: `${artworkCardShellBackground(theme)}, ${cardTextureOverlay(theme)}`,
    border: cardBorder(theme),
    boxShadow: cardShadow(theme),
    borderRadius: 20,
    height: "100%",
    overflow: "hidden",
    position: "relative",
    transition:
      "transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 280ms ease, box-shadow 320ms ease",

    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: 20,
      boxShadow: cardInnerRim(theme),
      pointerEvents: "none",
      zIndex: 2,
    },

    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: 20,
      background:
        theme.colorScheme === "dark"
          ? "radial-gradient(ellipse at 30% 20%, rgba(196,162,85,0.04) 0%, transparent 60%)"
          : "radial-gradient(ellipse at 30% 20%, rgba(196,162,85,0.06) 0%, transparent 60%)",
      pointerEvents: "none",
      zIndex: 1,
    },

    "&:hover": {
      transform: "translateY(-6px)",
      border: cardBorderHover(theme),
      boxShadow: cardShadowHover(theme),
    },
  },
  link: {
    position: "relative",
    zIndex: 3,
    "&:hover, &:focus": {
      textDecoration: "underline",
      cursor: "pointer",
    },
  },
}));

interface IProps {
  key?: string;
  item: {
    image: string;
    title: string;
    type: string;
    date: string;
    description: string;
  };
}

const EventsCard = ({ item }: IProps) => {
  const { title, type, description, date, image } = item;
  const { classes } = useStyles();
  const { t } = useI18n();

  return (
    <Paper
      key={`event-title-${title}`}
      component={motion.div}
      className={classes.card}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      exit={{ opacity: 0 }}
      viewport={{ once: true }}
    >
      <Image src={image} alt={title} height={320} fit="cover" radius="sm" />
      <Box p="md" sx={{ position: "relative", zIndex: 3 }}>
        <Stack align="start" spacing="xs">
          <Badge size="lg" variant="filled" radius="xs">
            {type}
          </Badge>
          <Text size="xl" weight={600} component="a" className={classes.link}>
            {title}
          </Text>
          <Flex gap="xs" align="center">
            <IconCalendarTime size={14} />
            <Text size="sm" transform="capitalize">
              {date}
            </Text>
          </Flex>
          <Spoiler
            maxHeight={48}
            showLabel={
              <Group mt="sm" spacing="xs">
                <IconChevronDown size={18} />
                <Text weight={500}>{t("events.showMore")}</Text>
              </Group>
            }
            hideLabel={
              <Group mt="sm" spacing="xs">
                <IconChevronUp size={18} />
                <Text weight={500}>{t("events.showLess")}</Text>
              </Group>
            }
          >
            <Text>{description}</Text>
          </Spoiler>
        </Stack>
      </Box>
    </Paper>
  );
};

export default EventsCard;
