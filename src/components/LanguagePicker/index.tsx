import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n";
import { createStyles, Group, Image, Menu, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

type LanguageOption = {
  code: Locale;
  label: string;
  nativeLabel: string;
  image: string;
};

const data: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    image:
      "https://res.cloudinary.com/ddh7hfzso/image/upload/v1677783783/meal%20mart/english_njrlxm.png",
  },
  {
    code: "zh",
    label: "Chinese",
    nativeLabel: "中文",
    image: "https://flagcdn.com/w40/cn.png",
  },
];

const useStyles = createStyles((theme, { opened }: { opened: boolean }) => ({
  control: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `.4rem 1rem`,
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
      icon={<Image src={item.image} width={18} height={18} alt="" />}
      onClick={() => setLocale(item.code)}
      key={item.code}
    >
      {item.label} ({item.nativeLabel})
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
            <Image src={selected.image} width={22} height={22} alt="" />
            <span className={classes.label}>{selected.nativeLabel}</span>
          </Group>
          <IconChevronDown size="1rem" className={classes.icon} stroke={1.5} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>{items}</Menu.Dropdown>
    </Menu>
  );
}
