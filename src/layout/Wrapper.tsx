import TopNav from "@/components/TopNav";
import { ReactNode, useState, useCallback } from "react";
import AppFooter from "@/components/AppFooter";
import FooterData from "@/data/footer.json";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Box, rem } from "@mantine/core";
import { motion } from "framer-motion";

interface IProps {
  children: ReactNode;
}

export default function Wrapper({ children }: IProps) {
  const [drawerOpened, setDrawerOpened] = useState(false);

  const handleDrawerToggle = useCallback((opened: boolean) => {
    setDrawerOpened(opened);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      style={{ minHeight: "100vh" }}
    >
      {/* Skip-to-content link for keyboard users — visually hidden until focused */}
      <Box
        component="a"
        href="#main-content"
        sx={(theme) => ({
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 10000,
          padding: "10px 18px",
          backgroundColor: "#c4a255",
          color: "#1a1815",
          fontWeight: 700,
          borderRadius: theme.radius.sm,
          textDecoration: "none",
          // Visually hidden (clip method) — more reliable than translateY
          clip: "rect(0, 0, 0, 0)",
          clipPath: "inset(50%)",
          width: "1px",
          height: "1px",
          margin: "-1px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          "&:focus, &:focus-visible": {
            clip: "auto",
            clipPath: "none",
            width: "auto",
            height: "auto",
            margin: "0",
            overflow: "visible",
            whiteSpace: "normal",
            boxShadow: `0 4px 16px rgba(196,162,85,0.3)`,
          },
        })}
      >
        Skip to content
      </Box>
      <Box
        component="header"
        sx={(theme) => ({
          position: "fixed",
          top: 0,
          zIndex: 2,
          width: "100%",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          backgroundColor: drawerOpened
            ? "#1a1815"
            : theme.colorScheme === "dark"
              ? "#1a1815"
              : "rgba(245,240,233,0.92)",
          borderBottom: `1px solid ${drawerOpened ? "rgba(255,255,255,0.05)" : theme.colorScheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
        })}
      >
        <TopBar />
        <TopNav onDrawerToggle={handleDrawerToggle} />
      </Box>
      <Box
        component="main"
        id="main-content"
        sx={(theme) => ({
          marginTop: `calc(${rem(104)} + env(safe-area-inset-top, 0px))`,
          paddingBottom: `calc(${rem(72)} + env(safe-area-inset-bottom, 0px))`,
          [theme.fn.smallerThan("sm")]: {
            marginTop: `calc(${rem(120)} + env(safe-area-inset-top, 0px))`,
          },
        })}
      >
        {children}
      </Box>
      <AppFooter data={FooterData.data} />
      <BottomNav />
    </motion.div>
  );
}
