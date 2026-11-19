import { Button, Card, Group, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { identityMorphism, ruleMorphism } from "../lib/rule";
import type { DpoDocument, MatchData } from "../lib/types";

interface Props {
  rule: DpoDocument["rule"];
  onChange: (side: "l" | "r", mapping: MatchData) => void;
}

export function MorphismEditor({ rule, onChange }: Props) {
  return (
    <SimpleGrid cols={{base: 1, md: 2}}>
      {(["l", "r"] as const).map((side) => {
        const targetName = side === "l" ? "L" : "R";
        const target = rule[targetName];
        const map = ruleMorphism(rule, side);
        const update = (kind: "nodes" | "edges", id: string, value: string | null) => {
          const next = {...map[kind]};
          if (value === null) delete next[id];
          else next[id] = value;
          onChange(side, {...map, [kind]: next});
        };
        return (
          <Card key={side} withBorder radius="md" role="region" aria-label={`Morfizm ${side}: K → ${targetName}`}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600}>{side}: K → {targetName}</Text>
                <Button size="xs" variant="light" onClick={() => onChange(side, identityMorphism(rule.K))}>Ustaw według id</Button>
              </Group>
              <Text size="xs" c="dimmed">Wybierz obraz każdego elementu K. Odwzorowanie musi być injektywne i zachowywać końce krawędzi.</Text>
              {rule.K.nodes.map(({id}) => (
                <Select
                  key={`node:${id}`}
                  label={`${side} - węzeł K: ${id}`}
                  placeholder={`Wybierz węzeł w ${targetName}`}
                  data={target.nodes.map((node) => ({value: node.id, label: `${node.id} (${node.label})`}))}
                  value={map.nodes[id] ?? null}
                  onChange={(value) => update("nodes", id, value)}
                  error={map.nodes[id] !== undefined && !target.nodes.some((node) => node.id === map.nodes[id]) ? "Nieistniejące id docelowe" : undefined}
                  searchable clearable
                />
              ))}
              {rule.K.edges.map((edge) => (
                <Select
                  key={`edge:${edge.id}`}
                  label={`${side} - krawędź K: ${edge.id} (${edge.source} → ${edge.target})`}
                  placeholder={`Wybierz krawędź w ${targetName}`}
                  data={target.edges.map((item) => ({value:item.id, label:`${item.id} (${item.source} → ${item.target})`}))}
                  value={map.edges[edge.id] ?? null}
                  onChange={(value) => update("edges", edge.id, value)}
                  error={map.edges[edge.id] !== undefined && !target.edges.some((item) => item.id === map.edges[edge.id]) ? "Nieistniejące id docelowe" : undefined}
                  searchable clearable
                />
              ))}
              {rule.K.nodes.length === 0 && <Text size="sm">K = ∅ - morfizm jest pusty.</Text>}
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
