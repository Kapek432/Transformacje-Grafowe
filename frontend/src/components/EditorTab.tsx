import { Alert, Card, Grid, Group, List, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMemo, useState, type Dispatch } from "react";
import { graphByName, type DocumentAction } from "../lib/document";
import { addEdge, addNode, nextNodeId, removeElements, renameEdge, renameNode, setNodeLabel } from "../lib/graphEdit";
import { completeLayout } from "../lib/layout";
import { emptyGraph, nodeIds, nodeLabel, type DpoDocument, type GraphData, type GraphName, type Position } from "../lib/types";
import { morphismImage } from "../lib/rule";
import { validateDocument } from "../lib/validate";
import { GraphCanvas, type CanvasSelection } from "./GraphCanvas";
import { JsonEditor } from "./JsonEditor";
import { Legend } from "./Legend";
import { MorphismEditor } from "./MorphismEditor";
import { SelectionPanel, type EditorSelection } from "./SelectionPanel";

interface Props {
  doc: DpoDocument;
  dispatch: Dispatch<DocumentAction>;
  dark: boolean;
  fitKey: string;
}

function selectionExists(doc: DpoDocument, selection: EditorSelection): boolean {
  const graph = graphByName(doc, selection.graph);
  return selection.kind === "node"
    ? graph.nodes.some((node) => node.id === selection.id)
    : graph.edges.some((edge) => edge.id === selection.id);
}

export function EditorTab({ doc, dispatch, dark, fitKey }: Props) {
  const [picked, setSelection] = useState<EditorSelection | null>(null);
  const [drawEdges, setDrawEdges] = useState(false);
  // JSON edits and loads can remove the picked element behind the panel's back.
  const selection = picked && selectionExists(doc, picked) ? picked : null;
  const issues = useMemo(() => validateDocument(doc), [doc]);
  const interfaceIds = { nodes: nodeIds(doc.rule.K), edges: doc.rule.K.edges.map((edge) => edge.id) };

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

  const deleteSelection = () =>
    guarded(() => {
      if (!selection) return;
      const graph = graphByName(doc, selection.graph);
      const nodes = selection.kind === "node" ? [selection.id] : [];
      const edges = selection.kind === "edge" ? [selection.id] : [];
      const { [selection.id]: _removed, ...positions } = positionsOf(selection.graph);
      edit(selection.graph, removeElements(graph, nodes, edges), selection.kind === "node" ? positions : undefined);
      setSelection(null);
    });

  const rename = (to: string) =>
    guarded(() => {
      if (!selection) return;
      const graph = graphByName(doc, selection.graph);
      // Validate before dispatch so invalid ids are reported by the editor's notification.
      if (selection.kind === "node") renameNode(graph, selection.id, to);
      else renameEdge(graph, selection.id, to);
      dispatch({type:"renameElement",name:selection.graph,kind:selection.kind,from:selection.id,to});
      setSelection({ ...selection, id: to });
    });

  const addLoop = () => {
    if (!selection) return;
    const reserved = otherSide(selection.graph).edges.map((edge) => edge.id);
    edit(selection.graph, addEdge(graphByName(doc, selection.graph), selection.id, selection.id, reserved));
  };

  const canvas = (name: GraphName, title: string, height: number) => (
    <Card withBorder radius="md" padding="sm">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{title}</Text>
      </Group>
      <GraphCanvas
        graph={graphByName(doc, name)}
        positions={positionsOf(name)}
        highlight={name === "G" ? {} : { interface: name === "K" ? interfaceIds : morphismImage(doc.rule, name === "L" ? "l" : "r") }}
        dark={dark}
        height={height}
        editable
        drawEdges={drawEdges}
        fitKey={fitKey}
        selected={selection?.graph === name ? selection : null}
        onAddNode={(position) =>
          guarded(() => {
            const graph = graphByName(doc, name);
            const id = nextNodeId(graph, nodeIds(otherSide(name)));
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
        onDeleteKey={() => selection?.graph === name && deleteSelection()}
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
          <Text fw={600}>Reguła L ← K → R</Text>
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            {canvas("L", "Lewa strona L", 280)}
            {canvas("K", "Interfejs K (osobny graf)", 280)}
            {canvas("R", "Prawa strona R", 280)}
          </SimpleGrid>
          {doc.rule.K.nodes.length === 0 && <Text size="sm" c="dimmed">K = ∅ - reguła nie zachowuje żadnych elementów.</Text>}
          <MorphismEditor rule={doc.rule} onChange={(side, mapping) => dispatch({type: "setMorphism", side, mapping})} />
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, lg: 4 }}>
        <Stack gap="md">
          <Card withBorder radius="md">
            <SelectionPanel
              key={JSON.stringify([selection, selection?.kind === "node" ? nodeLabel(graphByName(doc, selection.graph), selection.id) : null])}
              selection={selection}
              onRename={rename}
              nodeLabel={selection?.kind === "node" ? nodeLabel(graphByName(doc, selection.graph), selection.id) : undefined}
              onLabelChange={(label) => guarded(() => {
                if (!selection || selection.kind !== "node") return;
                edit(selection.graph, setNodeLabel(graphByName(doc, selection.graph), selection.id, label));
              })}
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
