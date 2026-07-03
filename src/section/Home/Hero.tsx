import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  createStyles,
  rem,
  Text,
} from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { useI18n } from "@/i18n";
import { primaryActionButtonSx } from "@/components/artworkStyles";

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
    background: "linear-gradient(180deg, rgba(8, 8, 8, 0.28) 0%, rgba(8, 8, 8, 0.52) 100%)",
    padding: rem(32),
  },
  content: {
    width: "100%",
    maxWidth: rem(860),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rem(8),
  },
  title: {
    fontFamily: "\"Playfair Display\", Georgia, 'Times New Roman', serif",
    fontSize: rem(48),
    fontWeight: 300,
    color: "#fff",
    textAlign: "center" as const,
    letterSpacing: "-0.03em",
    lineHeight: 1.1,
    maxWidth: rem(760),
    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(30),
    },
  },
  subtitle: {
    fontSize: rem(18),
    fontWeight: 300,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center" as const,
    maxWidth: rem(620),
    marginTop: rem(16),
    letterSpacing: "-0.01em",
    lineHeight: 1.7,
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
    fontWeight: 500,
    fontSize: rem(14),
    minHeight: rem(48),
    padding: `${rem(10)} ${rem(30)}`,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  playBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.88)",
    fontWeight: 400,
    fontSize: rem(13),
    minHeight: rem(48),
    padding: `${rem(10)} ${rem(22)}`,
    backdropFilter: "blur(8px)",
    "&:hover": {
      color: "#fff",
      background: "rgba(255,255,255,0.14)",
      borderColor: "rgba(255,255,255,0.22)",
    },
  },
}));

export default function HeroSection() {
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [pause, setPause] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const { classes } = useStyles();
  const { t } = useI18n();
  const smallerThan = useMediaQuery("(max-width: 600px)");

  // On mobile, don't auto-play — let user choose to play the video
  useEffect(() => {
    if (!smallerThan) {
      // Desktop: auto-play as before
      videoRef.current?.play();
    }
  }, [smallerThan]);

  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      videoRef.current.play();
      setPause(false);
    }
  }, [videoEnabled]);

  const pauseVideo = (): void => {
    if (!videoEnabled) {
      setVideoEnabled(true);
      return;
    }
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPause(false);
    } else {
      videoRef.current.pause();
      setPause(true);
    }
  };

  return (
    <Box className={classes.wrapper}>
      {smallerThan && !videoEnabled ? (
        /* Mobile static fallback — saves battery & data until user opts in */
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/static/video/hero-fallback.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center bottom",
          }}
        />
      ) : (
        <video
          className={classes.videoBg}
          autoPlay={!smallerThan}
          loop
          muted
          playsInline
          ref={videoRef}
          style={{ display: videoEnabled || !smallerThan ? "block" : "none" }}
        >
          <source
            src={require("../../../public/static/video/walkthrough.mp4")}
            type="video/mp4"
          />
        </video>
      )}
      <Box className={classes.overlay}>
        <Box className={classes.content}>
          <h1 className={classes.title}>{t("home.heroTitle")}</h1>
          <Text className={classes.subtitle}>{t("home.heroDescription")}</Text>
          <Box className={classes.actions}>
            <Button
              className={classes.primaryBtn}
              sx={primaryActionButtonSx}
              onClick={() => router.push("/shop")}
            >
              {t("home.learnMore")}
            </Button>
            <Button
              className={classes.playBtn}
              leftIcon={
                !videoEnabled ? (
                  <IconPlayerPlay size={15} />
                ) : pause ? (
                  <IconPlayerPlay size={15} />
                ) : (
                  <IconPlayerPause size={15} />
                )
              }
              onClick={pauseVideo}
            >
              {!videoEnabled
                ? (smallerThan ? t("home.playVideo") : t("home.pauseVideo"))
                : pause
                  ? t("home.playVideo")
                  : t("home.pauseVideo")}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
