import { describe, expect, it } from "vitest";
import { STEPS, interfaceInHost, stepHighlight, unionGraph } from "./steps";

describe("steps", () => {
  it("composes l and match using ids even when K and L names differ", () => {
    const rule = {
      L:{nodes:[{id:"left",label:"A"}],edges:[{id:"le",source:"left",target:"left"}]},
      K:{nodes:[{id:"k",label:"A"}],edges:[{id:"ke",source:"k",target:"k"}]},
      R:{nodes:[{id:"right",label:"A"}],edges:[]},
      l:{nodes:{k:"left"},edges:{ke:"le"}},
    };
    expect(interfaceInHost(rule,{nodes:{left:"host"},edges:{le:"loop"}})).toEqual({nodes:["host"],edges:["loop"]});
    expect(interfaceInHost({...rule,K:{nodes:[],edges:[]},l:{nodes:{},edges:{}}},{nodes:{},edges:{}})).toEqual({nodes:[],edges:[]});
  });
  it("merges host and result without duplicates", () => {
    const host = { nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}], edges: [{ id: "ab", source: "a", target: "b" }] };
    const result = { nodes: [{"id": "a", "label": "a"}, {"id": "n", "label": "n"}], edges: [{ id: "an", source: "a", target: "n" }] };

    expect(unionGraph(host, result)).toEqual({
      nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}, {"id": "n", "label": "n"}],
      edges: [
        { id: "ab", source: "a", target: "b" },
        { id: "an", source: "a", target: "n" },
      ],
    });
  });

  it("shows the right elements in each step", () => {
    const matched = { nodes: ["a", "b"], edges: ["ab"] };
    const removed = { nodes: ["b"], edges: ["ab"] };
    const added = { nodes: ["n"], edges: ["an"] };

    const preserved = {nodes:["a"],edges:[]};
    expect(STEPS).toHaveLength(5);
    expect(stepHighlight(0, matched, removed, added, preserved)).toEqual({ matched, hidden: added });
    expect(stepHighlight(1, matched, removed, added, preserved)).toEqual({interface:preserved,hidden:added});
    expect(stepHighlight(2, matched, removed, added, preserved)).toEqual({interface:preserved, matched, removed, hidden: added});
    expect(stepHighlight(3, matched, removed, added, preserved)).toEqual({
      interface: preserved,
      hidden: { nodes: ["b", "n"], edges: ["ab", "an"] },
    });
    expect(stepHighlight(4, matched, removed, added, preserved)).toEqual({interface:preserved, added, hidden:removed});
  });
});
