import { parseDocument } from "./lib/parse";
import type { ApplyResponse, DpoDocument, MatchData, MatchesResponse } from "./lib/types";

export type ExportFormat = "json" | "csv" | "excel";

export const EXPORT_FILENAMES: Record<ExportFormat, string> = {
  json: "output.json",
  csv: "wynik.zip",
  excel: "wynik.xlsx",
};

export type RuleInput = Pick<DpoDocument, "graph" | "rule">;
export type ApplyInput = RuleInput & { match: MatchData };

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, init);
  if (response.ok) return response;
  let message = `${response.status} ${response.statusText}`;
  try {
    const detail = ((await response.json()) as { detail?: unknown }).detail;
    if (typeof detail === "string") message = detail;
    else if (detail !== undefined) message = JSON.stringify(detail);
  } catch {
    // Non-JSON error bodies keep the HTTP status text.
  }
  throw new ApiError(response.status, message);
}

const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  listExamples: async (): Promise<string[]> => (await send("/api/examples")).json(),
  readExample: async (name: string): Promise<DpoDocument> =>
    parseDocument(await (await send(`/api/examples/${encodeURIComponent(name)}`)).text()),
  saveExample: async (name: string, doc: DpoDocument, overwrite: boolean): Promise<void> => {
    await send(`/api/examples/${encodeURIComponent(name)}?overwrite=${overwrite}`, jsonBody("PUT", doc));
  },
  findMatches: async (input: RuleInput): Promise<MatchesResponse> =>
    (await send("/api/matches", jsonBody("POST", input))).json(),
  apply: async (input: ApplyInput): Promise<ApplyResponse> =>
    (await send("/api/apply", jsonBody("POST", input))).json(),
  exportFile: async (input: ApplyInput, format: ExportFormat): Promise<Blob> =>
    (await send(`/api/export/${format}`, jsonBody("POST", input))).blob(),
};

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
