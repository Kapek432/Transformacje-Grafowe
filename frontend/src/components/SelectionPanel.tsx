import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import type { GraphName } from "../lib/types";

export interface EditorSelection {
  graph: GraphName;
  kind: "node" | "edge";
  id: string;
}

interface Props {
  selection: EditorSelection | null;
  onRename: (id: string) => void;
  onDelete: () => void;
  onAddLoop: () => void;
}

export function SelectionPanel({ selection, onRename, onDelete, onAddLoop }: Props) {
  const [value, setValue] = useState(selection?.id ?? "");
  if (!selection) {
    return (
      <Text size="sm" c="dimmed">
        Kliknij wierzchołek lub krawędź, żeby zmienić id albo usunąć element. Dwuklik na pustym tle
        dodaje wierzchołek. W trybie rysowania przeciągnij od wierzchołka do wierzchołka, żeby dodać
        krawędź.
      </Text>
    );
  }
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>
        {selection.kind === "node" ? "Wierzchołek" : "Krawędź"} w grafie {selection.graph}
      </Text>
      <TextInput
        label="Identyfikator"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onRename(value.trim());
        }}
      />
      <Group gap="xs">
        <Button size="xs" onClick={() => onRename(value.trim())}>
          Zmień id
        </Button>
        {selection.kind === "node" && (
          <Button size="xs" variant="light" onClick={onAddLoop}>
            Dodaj pętlę
          </Button>
        )}
        <Button size="xs" color="red" variant="light" onClick={onDelete}>
          Usuń
        </Button>
      </Group>
    </Stack>
  );
}
