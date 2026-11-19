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
  nodeLabel?: string;
  onLabelChange: (label: string) => void;
}

export function SelectionPanel({ selection, onRename, onDelete, onAddLoop, nodeLabel, onLabelChange }: Props) {
  const [value, setValue] = useState(selection?.id ?? "");
  const [label, setLabel] = useState(nodeLabel ?? "");
  if (!selection) {
    return (
      <Text size="sm" c="dimmed">
        Kliknij wierzchołek, żeby zmienić jego etykietę lub id. Różne wierzchołki mogą mieć taką samą etykietę. Dwuklik na pustym tle
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
      {selection.kind === "node" && (
        <>
          <TextInput
            label="Etykieta"
            description="Tekst na rysunku. Może się powtarzać; nie wpływa na dopasowania."
            value={label}
            onChange={(event) => setLabel(event.currentTarget.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onLabelChange(label); }}
          />
          <Button size="xs" variant="light" onClick={() => onLabelChange(label)}>Zmień etykietę</Button>
        </>
      )}
      <TextInput
        label="Identyfikator"
        description="Unikalne id używane przez krawędzie i dopasowania."
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
