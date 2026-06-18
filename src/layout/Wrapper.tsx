import TopNav from "@/components/TopNav";
import { ReactNode } from "react";
import AppFooter from "@/components/AppFooter";
import FooterData from "@/data/footer.json";
import TopBar from "@/components/TopBar";
import { Box, rem } from "@mantine/core";
import { motion } from "framer-motion";

interface IProps {
  children: ReactNode;
}

export default function Wrapper({ children }: IProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      style={{ minHeight: "100vh" }}
    >
      <Box
        sx={(theme) => ({
          position: "fixed",
          top: 0,
          zIndex: 2,
          width: "100%",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          backgroundColor: theme.colorScheme === "dark"
            ? "#1a1815"
            : "rgba(245,240,233,0.86)",
          borderBottom: `1px solid ${theme.colorScheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
        })}
      >
        <TopBar />
        <TopNav />
      </Box>
      <Box
        sx={(theme) => ({
          marginTop: `calc(${rem(104)} + env(safe-area-inset-top, 0px))`,
          [theme.fn.smallerThan("sm")]: {
            marginTop: `calc(${rem(120)} + env(safe-area-inset-top, 0px))`,
          },
        })}
      >
        {children}
      </Box>
      <AppFooter data={FooterData.data} />
    </motion.div>
  );
}
