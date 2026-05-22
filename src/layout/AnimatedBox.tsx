import { ReactNode } from "react";
import { motion } from "framer-motion";

interface IProps {
  children: ReactNode;
}

const AnimatedBox = ({ children }: IProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.34,
        ease: "easeOut",
      }}
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedBox;
