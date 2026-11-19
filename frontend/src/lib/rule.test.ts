import { describe, expect, it } from "vitest";
import { identityMorphism, morphismImage, ruleMorphism } from "./rule";
import { emptyDocument, documentReducer, graphByName, normalizeDocument } from "./document";
import { parseDocument } from "./parse";
import type { MatchData } from "./types";
import { validateDocument } from "./validate";

const L = {nodes:[{"id": "a", "label": "a"}, {"id": "b", "label": "b"}],edges:[{id:"ab",source:"a",target:"b"}]};
const K = {nodes:[{"id": "k1", "label": "k1"}, {"id": "k2", "label": "k2"}],edges:[{id:"ke",source:"k1",target:"k2"}]};
const R = {nodes:[{"id": "x", "label": "x"}, {"id": "y", "label": "y"}],edges:[{id:"xy",source:"x",target:"y"}]};
const l = {nodes:{k1:"a",k2:"b"},edges:{ke:"ab"}};
const r = {nodes:{k1:"x",k2:"y"},edges:{ke:"xy"}};
const doc = {...emptyDocument(), rule:{L,K,R,l,r}};

describe("independent K and explicit morphisms", () => {
  it("allows different ids in K, L and R", () => {
    expect(validateDocument(doc)).toEqual([]);
    expect(morphismImage(doc.rule,"l")).toEqual({nodes:["a","b"],edges:["ab"]});
    expect(morphismImage(doc.rule,"r")).toEqual({nodes:["x","y"],edges:["xy"]});
    expect(graphByName(doc,"K")).toEqual(K);
  });
  it("does not infer K on loading or editing sides", () => {
    const original = {...emptyDocument(),rule:{L,K:{nodes:[],edges:[]},R:L}};
    expect(normalizeDocument(original).rule.K.nodes.map((node) => node.id)).toEqual([]);
    expect(documentReducer(original,{type:"editGraph",name:"L",graph:L}).rule.K.nodes.map((node) => node.id)).toEqual([]);
    expect(ruleMorphism(original.rule,"l")).toEqual({nodes:{},edges:{}});
  });
  it("retains a strict, independently defined subset for legacy inclusions", () => {
    const original = {...emptyDocument(),rule:{L,K:{nodes:[{"id": "a", "label": "a"}],edges:[]},R:L}};
    expect(normalizeDocument(original).rule.K.nodes.map((node) => node.id)).toEqual(["a"]);
    expect(ruleMorphism(original.rule,"l").nodes).toEqual({a:"a"});
    expect(identityMorphism(K)).toEqual({nodes:{k1:"k1",k2:"k2"},edges:{ke:"ke"}});
  });
  it("roundtrips graph K and both maps through JSON", () => {
    expect(parseDocument(JSON.stringify(doc)).rule).toEqual(doc.rule);
  });
  it("rejects missing, noninjective or nonincident maps", () => {
    const invalid: MatchData[] = [
      {nodes:{k1:"a"},edges:{ke:"ab"}},
      {nodes:{k1:"a",k2:"a"},edges:{ke:"ab"}},
      {nodes:{k1:"b",k2:"a"},edges:{ke:"ab"}},
      {nodes:{k1:"a",k2:"b"},edges:{ke:"missing"}},
    ];
    for (const mapping of invalid) expect(validateDocument({...doc,rule:{...doc.rule,l:mapping}}).length).toBeGreaterThan(0);
  });
  it("edits K without overwriting the side graphs or autoassigning images", () => {
    const next = documentReducer(doc,{type:"editGraph",name:"K",graph:{nodes:[{"id": "k1", "label": "k1"}, {"id": "new", "label": "new"}],edges:[]}});
    expect(next.rule.L).toEqual(L);
    expect(next.rule.R).toEqual(R);
    expect(next.rule.K.nodes.map((node) => node.id)).toEqual(["k1","new"]);
    expect(next.rule.l).toEqual({nodes:{k1:"a"},edges:{}});
    expect(validateDocument(next).length).toBeGreaterThan(0);
  });
  it("updates morphism references when renaming a K source or a side target", () => {
    const renamedK = documentReducer(doc,{type:"renameElement",name:"K",kind:"node",from:"k1",to:"new-k"});
    expect(renamedK.rule.l?.nodes).toEqual({"new-k":"a",k2:"b"});
    expect(renamedK.rule.r?.nodes).toEqual({"new-k":"x",k2:"y"});
    expect(validateDocument(renamedK)).toEqual([]);
    const renamedL = documentReducer(doc,{type:"renameElement",name:"L",kind:"edge",from:"ab",to:"new-edge"});
    expect(renamedL.rule.l?.edges).toEqual({ke:"new-edge"});
    expect(validateDocument(renamedL)).toEqual([]);
  });
  it("edits a morphism without touching K", () => {
    const next = documentReducer({...doc,match:{nodes:{},edges:{}}},{type:"setMorphism",side:"l",mapping:l});
    expect(next.rule.K).toEqual(K);
    expect(next.rule.l).toEqual(l);
    expect(next.match).toBeUndefined();
  });
});
