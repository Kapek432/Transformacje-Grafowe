import { Alert, Card, Grid, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { api } from "../api";
import type { DocumentAction } from "../lib/document";
import { danglingExplanation } from "../lib/explain";
import { completeLayout } from "../lib/layout";
import { matchIds, sameMatch } from "../lib/match";
import { unionGraph } from "../lib/steps";
import type { Highlight } from "../lib/toCytoscape";
import type { ApplyResponse, DpoDocument, GraphData, MatchData, MatchInfo, MatchesResponse, Position } from "../lib/types";
import { validateDocument } from "../lib/validate";
import { GraphCanvas } from "./GraphCanvas";
import { Legend } from "./Legend";
import { MatchList } from "./MatchList";
import { StepAnimator } from "./StepAnimator";

interface Props {
  doc: DpoDocument;
  dispatch: Dispatch<DocumentAction>;
  dark: boolean;
}

interface PanelProps {
  title: string;
  graph: GraphData;
  positions: Record<string, Position>;
  highlight: Highlight;
  dark: boolean;
  fitKey: string;
}

function GraphPanel({ title, graph, positions, highlight, dark, fitKey }: PanelProps) {
  return (
    <Card withBorder radius="md" padding="sm">
      <Text fw={600} mb="xs">
        {title}
      </Text>
      <GraphCanvas graph={graph} positions={positions} highlight={highlight} dark={dark} height={380} fitKey={fitKey} />
    </Card>
  );
}

export function TransformTab({ doc, dispatch, dark }: Props) {
  const [matches, setMatches] = useState<MatchesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [applied, setApplied] = useState<ApplyResponse | null>(null);
  const [view, setView] = useState("side");
  const ruleKey = JSON.stringify([doc.graph, doc.rule]);
  // Responses can arrive out of order, so only the latest apply request may update the view.
  const applyRequest = useRef(0);

  const choose = (match: MatchInfo, index: number) => {
    const chosen: MatchData = { nodes: match.nodes, edges: match.edges };
    const request = ++applyRequest.current;
    setSelected(index);
    setApplied(null);
    dispatch({ type: "setMatch", match: chosen });
    api
      .apply({ graph: doc.graph, rule: doc.rule, match: chosen })
      .then((response) => {
        if (request === applyRequest.current) setApplied(response);
      })
      .catch((exception) => {
        if (request !== applyRequest.current) return;
        setSelected(null);
        notifications.show({ color: "red", title: "Nie zastosowano reguły", message: (exception as Error).message });
      });
  };

  // Refetching only on graph or rule changes keeps setMatch and layout edits from triggering a loop.
  useEffect(() => {
    applyRequest.current += 1;
    setMatches(null);
    setSelected(null);
    setHovered(null);
    setApplied(null);
    setError(null);
    if (validateDocument(doc).length > 0) {
      setError("Popraw błędy w zakładce Edycja.");
      return;
    }
    let cancelled = false;
    api
      .findMatches({ graph: doc.graph, rule: doc.rule })
      .then((response) => {
        if (cancelled) return;
        setMatches(response);
        const preset = doc.match ? response.matches.findIndex((m) => sameMatch(m, doc.match!)) : -1;
        if (preset >= 0) choose(response.matches[preset], preset);
      })
      .catch((exception) => {
        if (!cancelled) setError((exception as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [ruleKey]);

  const active = hovered ?? selected;
  const activeMatch = active !== null ? matches?.matches[active] : undefined;
  const outcome = applied?.result;
  const resultGraph = outcome?.status === "applied" ? outcome.result_graph : null;
  const union = useMemo(
    () => (resultGraph ? unionGraph(doc.graph, resultGraph) : doc.graph),
    [doc.graph, resultGraph],
  );
  const positions = useMemo(() => completeLayout(union, doc.layout?.G), [union, doc.layout]);
  const hostHighlight: Highlight = {
    matched: activeMatch ? matchIds(activeMatch) : undefined,
    removed: hovered === null ? applied?.removed : undefined,
    dangling: activeMatch?.dangling_edge ?? null,
  };
  const fitKey = String(selected);

  const sideBySide = (
    <SimpleGrid cols={{ base: 1, md: 3 }}>
      <GraphPanel title="G (wejście)" graph={doc.graph} positions={positions} highlight={hostHighlight} dark={dark} fitKey="G" />
      {outcome?.status === "applied" && applied ? (
        <>
          <GraphPanel title="D (graf pośredni)" graph={outcome.intermediate_graph} positions={positions} highlight={{}} dark={dark} fitKey={fitKey} />
          <GraphPanel title="H (wynik)" graph={outcome.result_graph} positions={positions} highlight={{ added: applied.added }} dark={dark} fitKey={fitKey} />
        </>
      ) : outcome?.status === "rejected" && doc.match ? (
        <Alert color="red" title="Reguła odrzucona" style={{ gridColumn: "span 2" }}>
          {danglingExplanation(doc.rule, doc.match, doc.graph, outcome.edge_id)}
        </Alert>
      ) : (
        <Card withBorder radius="md" style={{ gridColumn: "span 2" }}>
          <Text c="dimmed">Wybierz dopasowanie z listy, żeby zobaczyć graf pośredni D i wynik H.</Text>
        </Card>
      )}
    </SimpleGrid>
  );

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, lg: 3 }}>
        <Card withBorder radius="md">
          <Text fw={600} mb="xs">
            Dopasowania L w G
          </Text>
          <MatchList response={matches} error={error} selected={selected} onHover={setHovered} onSelect={choose} />
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 9 }}>
        <Stack gap="md">
          <SegmentedControl
            value={view}
            onChange={setView}
            data={[
              { value: "side", label: "Obok siebie" },
              { value: "steps", label: "Krok po kroku" },
            ]}
            w="fit-content"
          />
          <Legend items={["matched", "removed", "added"]} />
          {view === "side" ? (
            sideBySide
          ) : resultGraph && applied && doc.match ? (
            <StepAnimator
              union={union}
              positions={positions}
              matched={matchIds(doc.match)}
              removed={applied.removed}
              added={applied.added}
              dark={dark}
            />
          ) : (
            <Alert color="blue" title="Animacja niedostępna">
              Wybierz dopasowanie, które można zastosować.
            </Alert>
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
