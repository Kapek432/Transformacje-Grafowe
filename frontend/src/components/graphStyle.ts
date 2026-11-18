import type cytoscape from "cytoscape";

export const COLORS = {
  node: "#4c6ef5",
  interface: "#7048e8",
  matched: "#f08c00",
  removed: "#e03131",
  added: "#2f9e44",
};

export function graphStyle(dark: boolean): cytoscape.StylesheetJson {
  const text = dark ? "#e9ecef" : "#212529";
  const edge = dark ? "#909296" : "#868e96";
  return [
    {
      selector: "node",
      style: {
        "background-color": COLORS.node,
        label: "data(label)",
        color: "#ffffff",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": 12,
        "font-weight": "bold",
        width: 40,
        height: 40,
        "border-width": 2,
        "border-color": dark ? "#1a1b1e" : "#ffffff",
        "transition-property": "opacity, background-color, border-color",
        "transition-duration": 400,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": edge,
        "target-arrow-color": edge,
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(label)",
        "font-size": 9,
        color: text,
        "text-background-color": dark ? "#25262b" : "#ffffff",
        "text-background-opacity": 0.85,
        "text-background-padding": "2px",
        "text-rotation": "autorotate",
        "transition-property": "opacity, line-color, target-arrow-color, width",
        "transition-duration": 400,
      },
    },
    { selector: "node.interface", style: { "border-color": COLORS.interface, "border-width": 4 } },
    { selector: "edge.interface", style: { "line-color": COLORS.interface, "target-arrow-color": COLORS.interface, width: 3 } },
    { selector: "node.matched", style: { "background-color": COLORS.matched } },
    { selector: "edge.matched", style: { "line-color": COLORS.matched, "target-arrow-color": COLORS.matched, width: 3 } },
    { selector: "node.removed", style: { "background-color": COLORS.removed } },
    { selector: "edge.removed", style: { "line-color": COLORS.removed, "target-arrow-color": COLORS.removed, "line-style": "dashed", width: 3 } },
    { selector: "node.added", style: { "background-color": COLORS.added } },
    { selector: "edge.added", style: { "line-color": COLORS.added, "target-arrow-color": COLORS.added, width: 3 } },
    { selector: "edge.dangling", style: { "line-color": COLORS.removed, "target-arrow-color": COLORS.removed, width: 6 } },
    { selector: ".hidden", style: { opacity: 0, events: "no" } },
    { selector: ":selected", style: { "overlay-color": COLORS.matched, "overlay-opacity": 0.25 } },
    {
      selector: ".eh-handle",
      style: { "background-color": COLORS.added, width: 12, height: 12, shape: "ellipse", "overlay-opacity": 0, "border-width": 0, label: "" },
    },
    { selector: ".eh-source, .eh-target", style: { "border-width": 3, "border-color": COLORS.added } },
    {
      selector: ".eh-preview, .eh-ghost-edge",
      style: { "background-color": COLORS.added, "line-color": COLORS.added, "target-arrow-color": COLORS.added },
    },
    { selector: ".eh-ghost-edge.eh-preview-active", style: { opacity: 0 } },
  ];
}
