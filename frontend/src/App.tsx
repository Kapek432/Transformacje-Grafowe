import { AppShell, Tabs, Text, useComputedColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowsShuffle, IconPencil } from "@tabler/icons-react";
import { useEffect, useReducer, useState } from "react";
import { api, downloadBlob, EXPORT_FILENAMES, type ExportFormat } from "./api";
import { EditorTab } from "./components/EditorTab";
import { TopBar } from "./components/TopBar";
import { documentReducer, emptyDocument } from "./lib/document";
import type { DpoDocument } from "./lib/types";

const DEFAULT_EXAMPLE = "slide8";

const notifyError = (title: string) => (error: unknown) =>
  notifications.show({ color: "red", title, message: (error as Error).message });

export default function App() {
  const [doc, dispatch] = useReducer(documentReducer, undefined, emptyDocument);
  const [examples, setExamples] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [tab, setTab] = useState<string | null>("edit");
  const dark = useComputedColorScheme("light") === "dark";

  const load = (next: DpoDocument, name: string | null) => {
    dispatch({ type: "load", document: next });
    setCurrent(name);
    setFitKey((key) => key + 1);
  };

  const openExample = (name: string) =>
    api.readExample(name).then((next) => load(next, name)).catch(notifyError("Nie wczytano przykładu"));

  useEffect(() => {
    api
      .listExamples()
      .then((names) => {
        setExamples(names);
        if (names.includes(DEFAULT_EXAMPLE)) void openExample(DEFAULT_EXAMPLE);
      })
      .catch(notifyError("Brak połączenia z serwerem"));
  }, []);

  const save = async (name: string, overwrite: boolean) => {
    await api.saveExample(name, doc, overwrite);
    setCurrent(name);
    setExamples(await api.listExamples());
    notifications.show({ color: "green", title: "Zapisano", message: `examples/${name}.json` });
  };

  const download = (format: ExportFormat) => {
    if (!doc.match) return;
    api
      .exportFile({ graph: doc.graph, rule: doc.rule, match: doc.match }, format)
      .then((blob) => downloadBlob(blob, EXPORT_FILENAMES[format]))
      .catch(notifyError("Nie pobrano wyniku"));
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <TopBar
          examples={examples}
          current={current}
          canDownload={Boolean(doc.match)}
          onSelectExample={(name) => void openExample(name)}
          onNew={() => load(emptyDocument(), null)}
          onSave={save}
          onUpload={(next) => load(next, null)}
          onDownload={download}
        />
      </AppShell.Header>
      <AppShell.Main>
        <Tabs value={tab} onChange={setTab} keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="edit" leftSection={<IconPencil size={16} />}>
              Edycja
            </Tabs.Tab>
            <Tabs.Tab value="transform" leftSection={<IconArrowsShuffle size={16} />}>
              Transformacja
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="edit">
            <EditorTab doc={doc} dispatch={dispatch} dark={dark} fitKey={String(fitKey)} />
          </Tabs.Panel>
          <Tabs.Panel value="transform">
            <Text c="dimmed">Widok transformacji powstaje w kolejnym zadaniu.</Text>
          </Tabs.Panel>
        </Tabs>
      </AppShell.Main>
    </AppShell>
  );
}
