import { ActionIcon, Button, Card, Group, Stepper, Text } from "@mantine/core";
import { IconPlayerPlay, IconPlayerTrackNext, IconPlayerTrackPrev } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { STEPS, stepHighlight } from "../lib/steps";
import type { GraphData, IdSets, Position } from "../lib/types";
import { GraphCanvas } from "./GraphCanvas";
import { Legend } from "./Legend";

const STEP_DELAY_MS = 1600;

interface Props {
  union: GraphData;
  positions: Record<string, Position>;
  matched: IdSets;
  removed: IdSets;
  added: IdSets;
  dark: boolean;
}

export function StepAnimator({ union, positions, matched, removed, added, dark }: Props) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = STEPS.length - 1;

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
      <GraphCanvas
        graph={union}
        positions={positions}
        highlight={stepHighlight(step, matched, removed, added)}
        dark={dark}
        height={480}
      />
      <Group mt="sm">
        <Legend items={["matched", "removed", "added"]} />
      </Group>
    </Card>
  );
}
