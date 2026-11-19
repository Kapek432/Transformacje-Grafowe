import { describe, expect, it } from "vitest";
import { addEdge, addNode, removeElements, renameEdge, renameNode, setNodeLabel } from "./graphEdit";
import { documentReducer } from "./document";
import { parseDocument } from "./parse";
import { morphismImage } from "./rule";
import { unionGraph } from "./steps";
import { toElements } from "./toCytoscape";
import { validateDocument } from "./validate";

const graph = { nodes: [{id:"a",label:"A"},{id:"b",label:"A"}], edges: [{id:"ab",source:"a",target:"b"}] };

describe("explicit node ids and labels", () => {
  it("uses ids for elements, endpoints and positions despite repeated labels", () => {
    const elements = toElements(graph, {a:{x:1,y:2},b:{x:3,y:4}}, {matched:{nodes:["b"],edges:[]}});
    expect(elements[0].data).toMatchObject({id:"n:a",originalId:"a",label:"A"});
    expect(elements[1]).toMatchObject({data:{id:"n:b",originalId:"b",label:"A"},position:{x:3,y:4},classes:"matched"});
    expect(elements[2].data).toMatchObject({source:"n:a",target:"n:b"});
  });
  it("edits labels without changing ids, connections or the match", () => {
    const updated = setNodeLabel(graph,"b","Inna");
    expect(updated.nodes).toEqual([{id:"a",label:"A"},{id:"b",label:"Inna"}]);
    expect(updated.edges).toEqual(graph.edges);
    expect(graph.nodes[1].label).toBe("A");
    const match = {nodes:{x:"a",y:"b"},edges:{xy:"ab"}};
    expect(documentReducer({graph,rule:{L:graph,K:graph,R:graph},match},{type:"editGraph",name:"G",graph:updated}).match).toEqual(match);
  });
  it("keeps the label when renaming id and removes nodes by id", () => {
    expect(renameNode(graph,"a","new").nodes).toEqual([{id:"new",label:"A"},{id:"b",label:"A"}]);
    expect(removeElements(graph,["a"],[]).nodes).toEqual([{id:"b",label:"A"}]);
  });
  it("retains node objects through edge edits and creates explicit ids", () => {
    expect(addEdge(graph,"b","a").nodes).toEqual(graph.nodes);
    expect(addNode(graph,"c").nodes.at(-1)).toEqual({id:"c",label:"c"});
    expect(renameEdge(graph,"ab","edge").nodes).toEqual(graph.nodes);
  });
  it("parses repeated labels but rejects the old string and label-map formats", () => {
    const doc = {graph,rule:{L:graph,K:graph,R:graph}};
    expect(parseDocument(JSON.stringify(doc)).graph.nodes).toEqual(graph.nodes);
    expect(validateDocument(doc)).toEqual([]);
    for (const invalid of [
      {nodes:["a","b"],edges:[]},
      {nodes:[{id:"a"}],edges:[]},
      {...graph,node_labels:{a:"A"}},
      {nodes:[{id:"a",label:3}],edges:[]},
    ]) expect(() => parseDocument(JSON.stringify({...doc,graph:invalid}))).toThrow();
  });
  it("validates unique ids instead of unique labels", () => {
    const bad = {nodes:[{id:"a",label:"A"},{id:"a",label:"B"}],edges:[]};
    expect(validateDocument({graph:bad,rule:{L:graph,K:graph,R:graph}}).length).toBeGreaterThan(0);
  });
  it("keeps node objects in animation and refers to ids in the K image", () => {
    const right = {nodes:[{id:"b",label:"B"},{id:"c",label:"A"}],edges:[]};
    expect(morphismImage({L:graph,K:{nodes:[{id:"b",label:"A"}],edges:[]},R:right},"l").nodes).toEqual(["b"]);
    expect(unionGraph(graph,right).nodes).toEqual([...graph.nodes,{id:"c",label:"A"}]);
  });
});
