import { Alert, Button, Card, Grid, Group, List, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMemo, useState, type Dispatch, type ReactNode } from "react";
import { graphByName, type DocumentAction } from "../lib/document";
import { addEdge, addNode, nextNodeId, removeElements, renameEdge, renameNode } from "../lib/graphEdit";
import { completeLayout } from "../lib/layout";
import { emptyGraph, type DpoDocument, type GraphData, type GraphName, type Position } from "../lib/types";
import { validateDocument } from "../lib/validate";
import { GraphCanvas, type CanvasSelection } from "./GraphCanvas";
import { JsonEditor } from "./JsonEditor";
import { Legend } from "./Legend";
import { SelectionPanel, type EditorSelection } from "./SelectionPanel";

interface Props {
  doc: DpoDocument;
  dispatch: Dispatch<DocumentAction>;
  dark: boolean;
  fitKey: string;
}

export function EditorTab({ doc, dispatch, dark, fitKey }: Props) {
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [drawEdges, setDrawEdges] = useState(false);
  const issues = useMemo(() => validateDocument(doc), [doc]);
  const interfaceIds = { nodes: doc.rule.K.nodes, edges: doc.rule.K.edges.map((edge) => edge.id) };

  const otherSide = (name: GraphName): GraphData => {
    if (name === "L") return doc.rule.R;
    return name === "R" ? doc.rule.L : emptyGraph();
  };
  const positionsOf = (name: GraphName) => completeLayout(graphByName(doc, name), doc.layout?.[name]);
  const edit = (name: GraphName, graph: GraphData, positions?: Record<string, Position>) =>
    dispatch({ type: "editGraph", name, graph, positions });
  const guarded = (action: () => void) => {
    try {
      action();
    } catch (error) {
      notifications.show({ color: "red", title: "Nie można wykonać operacji", message: (error as Error).message });
    }
  };

  const deleteSelection = () => {
    if (!selection) return;
    const graph = graphByName(doc, selection.graph);
    const nodes = selection.kind === "node" ? [selection.id] : [];
    const edges = selection.kind === "edge" ? [selection.id] : [];
    const { [selection.id]: _removed, ...positions } = positionsOf(selection.graph);
    edit(selection.graph, removeElements(graph, nodes, edges), selection.kind === "node" ? positions : undefined);
    setSelection(null);
  };

  const rename = (to: string) =>
    guarded(() => {
      if (!selection) return;
      const graph = graphByName(doc, selection.graph);
      if (selection.kind === "node") {
        const { [selection.id]: position, ...rest } = positionsOf(selection.graph);
        edit(selection.graph, renameNode(graph, selection.id, to), { ...rest, [to]: position });
      } else {
        edit(selection.graph, renameEdge(graph, selection.id, to));
      }
      setSelection({ ...selection, id: to });
    });

  const addLoop = () => {
    if (!selection) return;
    const reserved = otherSide(selection.graph).edges.map((edge) => edge.id);
    edit(selection.graph, addEdge(graphByName(doc, selection.graph), selection.id, selection.id, reserved));
  };

  const canvas = (name: GraphName, title: string, height: number, extra?: ReactNode) => (
    <Card withBorder radius="md" padding="sm">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{title}</Text>
        {extra}
      </Group>
      <GraphCanvas
        graph={graphByName(doc, name)}
        positions={positionsOf(name)}
        highlight={name === "G" ? {} : { interface: interfaceIds }}
        dark={dark}
        height={height}
        editable
        drawEdges={drawEdges}
        fitKey={fitKey}
        onAddNode={(position) =>
          guarded(() => {
            const graph = graphByName(doc, name);
            const id = nextNodeId(graph, otherSide(name).nodes);
            edit(name, addNode(graph, id), { ...positionsOf(name), [id]: position });
          })
        }
        onAddEdge={(source, target) =>
          edit(name, addEdge(graphByName(doc, name), source, target, otherSide(name).edges.map((edge) => edge.id)))
        }
        onSelect={(picked: CanvasSelection | null) =>
          setSelection((current) => (picked ? { graph: name, ...picked } : current?.graph === name ? null : current))
        }
        onPositionsChange={(positions) => dispatch({ type: "setPositions", name, positions })}
        onDeleteKey={deleteSelection}
      />
    </Card>
  );

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, lg: 8 }}>
        <Stack gap="md">
          <Group justify="space-between">
            <SegmentedControl
              value={drawEdges ? "draw" : "move"}
              onChange={(value) => setDrawEdges(value === "draw")}
              data={[
                { value: "move", label: "Przesuwanie" },
                { value: "draw", label: "Rysowanie krawędzi" },
              ]}
            />
            <Legend items={["interface"]} />
          </Group>
          {canvas("G", "Graf G", 340)}
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {canvas("L", "Lewa strona L", 280)}
            {canvas(
              "R",
              "Prawa strona R",
              280,
              <Button size="xs" variant="light" onClick={() => dispatch({ type: "copyLeftToRight" })}>
                Skopiuj L do R
              </Button>,
            )}
          </SimpleGrid>
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Stack gap="md">
          <Card withBorder radius="md">
            <SelectionPanel
              key={JSON.stringify(selection)}
              selection={selection}
              onRename={rename}
              onDelete={deleteSelection}
              onAddLoop={addLoop}
            />
          </Card>
          {issues.length > 0 ? (
            <Alert color="red" title="Błędy w danych">
              <List size="sm">
                {issues.map((issue) => (
                  <List.Item key={`${issue.graph}:${issue.message}`}>
                    {issue.graph}: {issue.message}
                  </List.Item>
                ))}
              </List>
            </Alert>
          ) : (
            <Alert color="green" title="Dane poprawne">
              Możesz przejść do zakładki Transformacja.
            </Alert>
          )}
          <Card withBorder radius="md">
            <Text fw={600} mb="xs">
              JSON
            </Text>
            <JsonEditor doc={doc} dark={dark} onChange={(next) => dispatch({ type: "load", document: next })} />
          </Card>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
