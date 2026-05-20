import {
  Container,
  createStyles,
  Header,
} from "@mantine/core";
import LanguagePicker from "@/components/LanguagePicker";

const useStyles = createStyles((theme) => ({
  inner: {
    height: "100%",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: `${theme.spacing.xs} ${theme.spacing.xl}`,
    backgroundColor: "#0f1216",
    color: theme.colors.dark[0],
    borderBottom: `1px solid rgba(216, 183, 109, 0.18)`,

    [theme.fn.smallerThan("sm")]: {
      justifyContent: "center",
    },
  },
}));

export default function TopBar() {
  const { classes } = useStyles();

  return (
    <Header height="100%" sx={{ borderBottom: 0 }}>
      <Container className={classes.inner} fluid>
        <LanguagePicker />
      </Container>
    </Header>
  );
}
