import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  createStyles,
  Flex,
  Paper,
  rem,
  Stack,
  Text,
} from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: "relative",
    minHeight: rem(650),

    [theme.fn.smallerThan("sm")]: {
      minHeight: rem(500),
    },
  },
  videoBg: {
    minWidth: "100%",
    height: rem(650),
    objectFit: "cover",
    objectPosition: "bottom",

    [theme.fn.smallerThan("sm")]: {
      minHeight: rem(500),
    },
  },
  content: {
    marginTop: rem(-320),
    paddingBottom: rem(96),

    [theme.fn.smallerThan("md")]: {
      minHeight: rem(500),
      marginTop: rem(-400),
      paddingBottom: 0,
    },
    [theme.fn.smallerThan("sm")]: {
      minHeight: rem(500),
      marginTop: rem(-480),
      paddingBottom: 0,
    },
  },
  heroPanel: {
    width: "min(100%, 860px)",
    minHeight: rem(220),
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backgroundColor: "rgba(32, 38, 46, 0.96)",
    border: "1px solid rgba(216, 183, 109, 0.18)",

    [theme.fn.smallerThan("sm")]: {
      minHeight: rem(240),
    },
  },
  heroDescription: {
    maxWidth: rem(760),
    minHeight: rem(58),
    marginLeft: "auto",
    marginRight: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    [theme.fn.smallerThan("sm")]: {
      minHeight: rem(84),
    },
  },
  heroAction: {
    minWidth: rem(170),
  },
}));
export default function HeroSection() {
  const videoRef = useRef<any>(null);
  const [pause, setPause] = useState(false);
  const { classes } = useStyles();
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

  const pauseVideo = (): void => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPause(false);
    } else {
      videoRef.current.pause();
      setPause(true);
    }
  };

  useEffect(() => {
    videoRef.current.play();
  }, []);

  return (
    <Box className={classes.wrapper}>
      <video className={classes.videoBg} autoPlay loop muted ref={videoRef}>
        <source
          src={require("../../../public/static/video/walkthrough.mp4")}
          type="video/mp4"
        />
      </video>
      <Container className={classes.content}>
        <Stack align="center" justify="end" pb="xl" sx={{ height: "100%" }}>
          <Paper
            p={smallerThan ? "md" : "lg"}
            shadow="md"
            className={classes.heroPanel}
          >
            <Text
              size={smallerThan ? 24 : 36}
              weight={600}
              mb="md"
              align="center"
            >
              {t("home.heroTitle")}
            </Text>
            <Text
              mb="md"
              size={smallerThan ? "md" : "lg"}
              align="center"
              className={classes.heroDescription}
            >
              {t("home.heroDescription")}
            </Text>
            <Flex
              justify="space-between"
              align="center"
              direction={{ base: "column", sm: "row" }}
              gap={{ base: "sm", sm: "lg" }}
            >
              <Button
                size="lg"
                fullWidth={smallerThan}
                className={classes.heroAction}
              >
                {t("home.learnMore")}
              </Button>
              <Button
                variant="white"
                leftIcon={
                  pause ? (
                    <IconPlayerPlay size={18} />
                  ) : (
                    <IconPlayerPause size={18} />
                  )
                }
                onClick={pauseVideo}
                fullWidth={smallerThan}
                className={classes.heroAction}
              >
                {pause ? t("home.playVideo") : t("home.pauseVideo")}
              </Button>
            </Flex>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
