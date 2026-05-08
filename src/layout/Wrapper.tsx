import TopNav from "@/components/TopNav";
import { ReactNode } from "react";
import AppFooter from "@/components/AppFooter";
import FooterData from "@/data/footer.json";
import TopBar from "@/components/TopBar";
import { Box, rem, useMantineTheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import SearchModal from "@/components/SearchModal";
import { motion } from "framer-motion";

interface IProps {
  children: ReactNode;
}

export default function Wrapper({ children }: IProps) {
  const theme = useMantineTheme();
  const [opened, { open, close }] = useDisclosure(false);
  const smallerThan = useMediaQuery("(max-width: 769px)");

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
        <TopNav handleOpenSearch={open} />
      </Box>
      <Box sx={{ marginTop: rem(104) }}>{children}</Box>
      <AppFooter data={FooterData.data} />
      <SearchModal opened={opened} close={close} />
    </motion.div>
  );
}
