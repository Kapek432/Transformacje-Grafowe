import { ActionIcon, Box, Group, Tooltip } from "@mantine/core";
import { IconFocusCentered, IconLayoutGrid } from "@tabler/icons-react";
import cytoscape, {
  type Core,
  type EdgeSingular,
  type ElementDefinition,
  type EventObject,
  type NodeSingular,
} from "cytoscape";
import edgehandles from "cytoscape-edgehandles";
import { useEffect, useRef } from "react";
import { elementClasses, toElements, type Highlight } from "../lib/toCytoscape";
import type { GraphData, Position } from "../lib/types";
import { graphStyle } from "./graphStyle";

cytoscape.use(edgehandles);

export interface CanvasSelection {
  kind: "node" | "edge";
  id: string;
}

export interface GraphCanvasProps {
  graph: GraphData;
  positions: Record<string, Position>;
  highlight?: Highlight;
  dark: boolean;
  height?: number;
  editable?: boolean;
  drawEdges?: boolean;
  fitKey?: string;
  onAddNode?: (position: Position) => void;
  onAddEdge?: (source: string, target: string) => void;
  onSelect?: (selection: CanvasSelection | null) => void;
  onPositionsChange?: (positions: Record<string, Position>) => void;
  onDeleteKey?: () => void;
}

const MAX_FIT_ZOOM = 1.4;

function readPositions(cy: Core): Record<string, Position> {
  return Object.fromEntries(
    cy.nodes().map((node) => [
      node.data("label") as string,
      { x: Math.round(node.position("x")), y: Math.round(node.position("y")) },
    ]),
  );
}

function fitView(cy: Core | null): void {
  if (!cy || cy.elements().empty()) return;
  cy.fit(undefined, 30);
  if (cy.zoom() > MAX_FIT_ZOOM) {
    cy.zoom(MAX_FIT_ZOOM);
    cy.center();
  }
}

/** Updates elements in place so selection and transitions survive position and class changes. */
function syncElements(cy: Core, elements: ElementDefinition[]): void {
  const wanted = new Set(elements.map((element) => element.data.id as string));
  cy.batch(() => {
    cy.elements().filter((element) => !wanted.has(element.id())).remove();
    for (const definition of elements) {
      const existing = cy.getElementById(definition.data.id as string);
      const endsChanged =
        definition.group === "edges" &&
        !existing.empty() &&
        (existing.data("source") !== definition.data.source ||
          existing.data("target") !== definition.data.target);
      if (existing.empty() || endsChanged) {
        existing.remove();
        cy.add(definition);
        continue;
      }
      if (definition.position) existing.position(definition.position);
      existing.classes(definition.classes as string);
    }
  });
}

export function GraphCanvas(props: GraphCanvasProps) {
  const { graph, positions, highlight = {}, dark, height = 320, editable = false, drawEdges = false, fitKey } = props;
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const ehRef = useRef<ReturnType<Core["edgehandles"]> | null>(null);
  const lastFit = useRef<string | undefined>(undefined);
  // Cytoscape listeners are bound once, so they read the latest props through this ref.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const cy = cytoscape({ container: container.current, style: graphStyle(dark), minZoom: 0.2, maxZoom: 3 });
    cyRef.current = cy;
    cy.on("dbltap", (event: EventObject) => {
      if (event.target === cy && latest.current.editable) {
        latest.current.onAddNode?.({ x: Math.round(event.position.x), y: Math.round(event.position.y) });
      }
    });
    cy.on("select unselect", () => {
      const selected = cy.$(":selected");
      if (selected.length !== 1) {
        latest.current.onSelect?.(null);
        return;
      }
      const element = selected[0];
      latest.current.onSelect?.({ kind: element.isNode() ? "node" : "edge", id: element.data("label") as string });
    });
    cy.on("dragfree", "node", () => latest.current.onPositionsChange?.(readPositions(cy)));
    const eh = cy.edgehandles({ canConnect: () => true, snap: true, hoverDelay: 0 });
    ehRef.current = eh;
    cy.on("ehcomplete", (_event: EventObject, ...params: unknown[]) => {
      const [source, target, added] = params as [NodeSingular, NodeSingular, EdgeSingular];
      added.remove();
      latest.current.onAddEdge?.(source.data("label") as string, target.data("label") as string);
    });
    return () => {
      eh.destroy();
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    cyRef.current?.style(graphStyle(dark));
  }, [dark]);

  const structureKey = JSON.stringify([graph, positions]);
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    syncElements(cy, toElements(graph, positions, latest.current.highlight ?? {}));
    const key = fitKey ?? "";
    if (lastFit.current !== key) {
      fitView(cy);
      lastFit.current = key;
    }
  }, [structureKey, fitKey]);

  const highlightKey = JSON.stringify(highlight);
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().forEach((element) => {
        const kind = element.isNode() ? "nodes" : "edges";
        element.classes(elementClasses(kind, element.data("label") as string, highlight).join(" "));
      });
    });
  }, [highlightKey]);

  useEffect(() => {
    const eh = ehRef.current;
    if (!eh) return;
    // Draw mode saves and restores the ungrabify state itself, so it must be toggled around our own setting.
    eh.disableDrawMode();
    cyRef.current?.autoungrabify(!editable);
    if (editable && drawEdges) eh.enableDrawMode();
  }, [editable, drawEdges]);

  const autoLayout = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const layout = cy.layout({ name: "cose", animate: true, animationDuration: 500, padding: 30 });
    layout.one("layoutstop", () => latest.current.onPositionsChange?.(readPositions(cy)));
    layout.run();
  };

  return (
    <Box
      pos="relative"
      h={height}
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--mantine-color-default-border)",
        background: dark ? "var(--mantine-color-dark-7)" : "var(--mantine-color-gray-0)",
      }}
    >
      <div
        ref={container}
        tabIndex={0}
        onKeyDown={(event) => {
          if (editable && (event.key === "Delete" || event.key === "Backspace")) {
            event.preventDefault();
            latest.current.onDeleteKey?.();
          }
        }}
        style={{ position: "absolute", inset: 0, outline: "none" }}
      />
      <Group gap={4} pos="absolute" top={8} right={8} style={{ zIndex: 1 }}>
        {editable && (
          <Tooltip label="Rozmieść automatycznie">
            <ActionIcon variant="default" onClick={autoLayout} aria-label="Rozmieść automatycznie">
              <IconLayoutGrid size={16} />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label="Dopasuj widok">
          <ActionIcon variant="default" onClick={() => fitView(cyRef.current)} aria-label="Dopasuj widok">
            <IconFocusCentered size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}
