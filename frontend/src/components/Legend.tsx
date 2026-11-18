import { Box, Group, Text } from "@mantine/core";
import { COLORS } from "./graphStyle";

const ITEMS = {
  interface: { label: "K (wspólne dla L i R)", color: COLORS.interface },
  matched: { label: "dopasowanie", color: COLORS.matched },
  removed: { label: "usuwane (L \\ K)", color: COLORS.removed },
  added: { label: "dodane (R \\ K)", color: COLORS.added },
};

export function Legend({ items }: { items: (keyof typeof ITEMS)[] }) {
  return (
    <Group gap="md">
      {items.map((item) => (
        <Group key={item} gap={6}>
          <Box w={12} h={12} style={{ borderRadius: "50%", background: ITEMS[item].color }} />
          <Text size="xs" c="dimmed">
            {ITEMS[item].label}
          </Text>
        </Group>
      ))}
    </Group>
  );
}
