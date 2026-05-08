import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n";
import { createStyles, Group, Menu, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

type LanguageOption = {
  code: Locale;
  label: string;
  image: string;
};

const data: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    image: "https://flagcdn.com/w40/us.png",
  },
  {
    code: "zh",
    label: "中文",
    image: "https://flagcdn.com/w40/cn.png",
  },
];

const useStyles = createStyles((theme, { opened }: { opened: boolean }) => ({
  control: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: `.35rem .6rem`,
    borderRadius: theme.radius.sm,
    transition: "background-color 150ms ease",
    color: theme.colors.dark[0],

    "&:hover": {
      backgroundColor: theme.colors.dark[6],
    },
  },

  label: {
    fontWeight: 600,
    fontSize: theme.fontSizes.sm,
  },

  flag: {
    display: "block",
    flex: "0 0 auto",
    width: 18,
    height: 12,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    borderRadius: 2,
  },

  menuFlag: {
    display: "block",
    width: 18,
    height: 12,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    borderRadius: 2,
  },

  icon: {
    transition: "transform 150ms ease",
    transform: opened ? "rotate(180deg)" : "rotate(0deg)",
  },
}));

export default function LanguagePicker() {
  const [opened, setOpened] = useState(false);
  const { locale, setLocale } = useI18n();
  const { classes } = useStyles({ opened });
  const selected = data.find((language) => language.code === locale) ?? data[0];

  const items = data.map((item) => (
    <Menu.Item
      icon={<span className={classes.menuFlag} style={{ backgroundImage: `url(${item.image})` }} />}
      onClick={() => setLocale(item.code)}
      key={item.code}
    >
      {item.label}
    </Menu.Item>
  ));

  return (
    <Menu
      onOpen={() => setOpened(true)}
      onClose={() => setOpened(false)}
      radius="sm"
      width="target"
      withinPortal
    >
      <Menu.Target>
        <UnstyledButton className={classes.control}>
          <Group spacing="xs">
            <span className={classes.flag} style={{ backgroundImage: `url(${selected.image})` }} />
            <span className={classes.label}>{selected.label}</span>
          </Group>
          <IconChevronDown size="1rem" className={classes.icon} stroke={1.5} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>{items}</Menu.Dropdown>
    </Menu>
  );
}
