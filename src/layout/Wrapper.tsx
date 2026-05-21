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
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      style={{ backgroundColor: "#15191f", color: "#f6efe3", minHeight: "100vh" }}
    >
      <Box
        sx={{
          position: "fixed",
          top: 0,
          zIndex: 2,
          width: "100%",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.36)",
        }}
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
