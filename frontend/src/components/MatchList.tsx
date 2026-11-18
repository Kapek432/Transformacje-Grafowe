import { Alert, Badge, Group, Loader, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import type { MatchInfo, MatchesResponse } from "../lib/types";

interface Props {
  response: MatchesResponse | null;
  error: string | null;
  selected: number | null;
  onHover: (index: number | null) => void;
  onSelect: (match: MatchInfo, index: number) => void;
}

export function MatchList({ response, error, selected, onHover, onSelect }: Props) {
  if (error) {
    return (
      <Alert color="red" title="Nie można wyszukać dopasowań">
        {error}
      </Alert>
    );
  }
  if (!response) {
    return (
      <Group justify="center" p="md">
        <Loader size="sm" />
      </Group>
    );
  }
  if (response.matches.length === 0) {
    return (
      <Alert color="yellow" title="Brak dopasowań">
        Graf G nie zawiera kopii L. Sprawdź kierunki krawędzi i to, czy G ma co najmniej tyle
        wierzchołków i krawędzi co L.
      </Alert>
    );
  }
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        Znaleziono {response.matches.length}
        {response.truncated ? "+" : ""}. Najedź, żeby podświetlić na G. Kliknij, żeby zastosować.
      </Text>
      {response.truncated && (
        <Alert color="yellow" variant="light">
          Pokazano pierwsze 200 dopasowań.
        </Alert>
      )}
      <ScrollArea.Autosize mah={560}>
        <Stack gap={6}>
          {response.matches.map((match, index) => (
            <Paper
              key={index}
              withBorder
              p="xs"
              radius="md"
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(match, index)}
              style={{
                cursor: "pointer",
                borderColor: index === selected ? "var(--mantine-primary-color-filled)" : undefined,
                borderWidth: index === selected ? 2 : 1,
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw={600}>
                  Dopasowanie {index + 1}
                </Text>
                {match.applicable ? (
                  <Badge color="green" variant="light">
                    można zastosować
                  </Badge>
                ) : (
                  <Badge color="red" variant="light">
                    wisząca krawędź
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" ff="monospace">
                {Object.entries(match.nodes)
                  .map(([left, host]) => `${left} -> ${host}`)
                  .join(", ") || "(pusta lewa strona)"}
              </Text>
              {match.dangling_edge && (
                <Text size="xs" c="red">
                  blokuje krawędź {match.dangling_edge}
                </Text>
              )}
            </Paper>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
