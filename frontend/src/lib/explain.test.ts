import { describe, expect, it } from "vitest";
import rejected from "../../../examples/slide8_rejected.json";
import { danglingExplanation } from "./explain";
import type { DpoDocument, MatchData } from "./types";

describe("danglingExplanation", () => {
  it("names the deleted node and the blocking edge", () => {
    const doc = rejected as unknown as DpoDocument;

    expect(danglingExplanation(doc.rule, doc.match as MatchData, doc.graph, "E-C")).toBe(
      'Reguły nie można zastosować. Usunięcie wierzchołka "E" zostawiłoby krawędź "E-C" bez końca, ' +
        "bo ta krawędź nie należy do dopasowania. To narusza warunek wiszącej krawędzi w DPO.",
    );
  });
});
