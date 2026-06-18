import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Container,
  createStyles,
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
    [theme.fn.smallerThan("sm")]: { minHeight: rem(480) },
  },
  videoBg: {
    minWidth: "100%",
    height: rem(650),
    objectFit: "cover",
    objectPosition: "bottom",
    [theme.fn.smallerThan("sm")]: { minHeight: rem(480) },
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.25)",
    padding: rem(32),
  },
  title: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: rem(48),
    fontWeight: 300,
    color: "#fff",
    textAlign: "center" as const,
    letterSpacing: "-0.03em",
    lineHeight: 1.1,
    maxWidth: rem(720),
    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(30),
    },
  },
  subtitle: {
    fontSize: rem(18),
    fontWeight: 300,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center" as const,
    maxWidth: rem(560),
    marginTop: rem(16),
    letterSpacing: "-0.01em",
    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(15),
    },
  },
  actions: {
    marginTop: rem(36),
    display: "flex",
    gap: rem(14),
    [theme.fn.smallerThan("sm")]: {
      flexDirection: "column" as const,
      width: "100%",
    },
  },
  primaryBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.5)",
    color: "#fff",
    fontWeight: 300,
    fontSize: rem(14),
    padding: `${rem(10)} ${rem(28)}`,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    "&:hover": {
      background: "rgba(255,255,255,0.12)",
      borderColor: "rgba(255,255,255,0.8)",
    },
  },
  playBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    fontWeight: 300,
    fontSize: rem(13),
    padding: `${rem(10)} ${rem(20)}`,
    "&:hover": {
      color: "#fff",
      background: "transparent",
    },
  },
}));

export default function HeroSection() {
  const router = useRouter();
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
    videoRef.current?.play();
  }, []);

  return (
    <Box className={classes.wrapper}>
      <video className={classes.videoBg} autoPlay loop muted ref={videoRef}>
        <source
          src={require("../../../public/static/video/walkthrough.mp4")}
          type="video/mp4"
        />
      </video>
      <Box className={classes.overlay}>
        <h1 className={classes.title}>{t("home.heroTitle")}</h1>
        <Text className={classes.subtitle}>{t("home.heroDescription")}</Text>
        <Box className={classes.actions}>
          <Button
            className={classes.primaryBtn}
            onClick={() => router.push("/shop")}
          >
            {t("home.learnMore")}
          </Button>
          <Button
            className={classes.playBtn}
            leftIcon={
              pause ? (
                <IconPlayerPlay size={15} />
              ) : (
                <IconPlayerPause size={15} />
              )
            }
            onClick={pauseVideo}
          >
            {pause ? t("home.playVideo") : t("home.pauseVideo")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
