import { ActionIcon, Button, Card, Group, SimpleGrid, Stack, Stepper, Text } from "@mantine/core";
import { IconPlayerPlay, IconPlayerTrackNext, IconPlayerTrackPrev } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { completeLayout } from "../lib/layout";
import { ruleMorphism } from "../lib/rule";
import { STEPS, interfaceInHost, stepHighlight } from "../lib/steps";
import type { DpoDocument, GraphData, IdSets, MatchData, Position } from "../lib/types";
import { GraphCanvas } from "./GraphCanvas";

const STEP_DELAY_MS = 1600;

interface Props {
  rule: DpoDocument["rule"];
  match: MatchData;
  union: GraphData;
  positions: Record<string, Position>;
  matched: IdSets;
  removed: IdSets;
  added: IdSets;
  dark: boolean;
}

export function StepAnimator({ rule, match, union, positions, matched, removed, added, dark }: Props) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = STEPS.length - 1;
  const preserved = interfaceInHost(rule, match);
  const left = ruleMorphism(rule, "l");
  const right = ruleMorphism(rule, "r");
  const interfaceIds = {nodes:rule.K.nodes.map((node) => node.id), edges:rule.K.edges.map((edge) => edge.id)};

  useEffect(() => {
    if (!playing) return;
    if (step >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), STEP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step, last]);

  return (
    <Card withBorder radius="md">
      <Group justify="space-between" mb="sm" align="flex-start">
        <div>
          <Text fw={600}>
            Krok {step + 1} z {STEPS.length}: {STEPS[step].title}
          </Text>
          <Text size="sm" c="dimmed">
            {STEPS[step].description}
          </Text>
        </div>
        <Group gap="xs">
          <ActionIcon variant="default" size="lg" aria-label="Poprzedni krok" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <IconPlayerTrackPrev size={16} />
          </ActionIcon>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            loading={playing}
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
          >
            Odtwórz
          </Button>
          <ActionIcon variant="default" size="lg" aria-label="Następny krok" disabled={step === last} onClick={() => setStep(step + 1)}>
            <IconPlayerTrackNext size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <Stepper active={step} onStepClick={setStep} size="sm" mb="md">
        {STEPS.map((item) => (
          <Stepper.Step key={item.title} label={item.title} />
        ))}
      </Stepper>
      <SimpleGrid cols={{base:1, md:step === 1 ? 2 : 1}}>
        <Stack gap="xs">
          <Text fw={600}>{step < 3 ? "Graf G" : step === 3 ? "Graf pośredni D" : "Wynik H"}</Text>
          <GraphCanvas
            key={step === 1 ? "with-k" : "full-width"}
            graph={union}
            positions={positions}
            highlight={stepHighlight(step, matched, removed, added, preserved)}
            dark={dark}
            height={400}
          />
        </Stack>
        {step === 1 && (
          <Card withBorder radius="md" role="region" aria-label="Interfejs K w transformacji">
            <Stack gap="xs">
              <Text fw={600}>K - zachowany interfejs reguły</Text>
              {rule.K.nodes.length > 0 ? (
                <GraphCanvas graph={rule.K} positions={completeLayout(rule.K)} highlight={{interface:interfaceIds}} dark={dark} height={240} />
              ) : <Text>K = ∅ - żaden element dopasowania nie jest zachowany.</Text>}
              <Text size="sm" c="dimmed">Obraz K w G: m ∘ l. Morfizm r wskazuje odpowiadające elementy w R.</Text>
              {rule.K.nodes.map((node) => (
                <Text key={`node:${node.id}`} size="xs">Węzeł: K[{node.id}] → L[{left.nodes[node.id]}] → G[{match.nodes[left.nodes[node.id]]}]; r → R[{right.nodes[node.id]}]</Text>
              ))}
              {rule.K.edges.map((edge) => (
                <Text key={`edge:${edge.id}`} size="xs">Krawędź: K[{edge.id}] → L[{left.edges[edge.id]}] → G[{match.edges[left.edges[edge.id]]}]; r → R[{right.edges[edge.id]}]</Text>
              ))}
            </Stack>
          </Card>
        )}
      </SimpleGrid>
    </Card>
  );
}
