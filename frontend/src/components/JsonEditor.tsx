import { json } from "@codemirror/lang-json";
import { Stack, Text } from "@mantine/core";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseDocument } from "../lib/parse";
import type { DpoDocument } from "../lib/types";

interface Props {
  doc: DpoDocument;
  dark: boolean;
  onChange: (doc: DpoDocument) => void;
}

export function JsonEditor({ doc, dark, onChange }: Props) {
  const serialized = useMemo(() => JSON.stringify(doc, null, 2), [doc]);
  const [text, setText] = useState(serialized);
  const [error, setError] = useState<string | null>(null);
  // Skipping the echo of our own edit keeps the cursor and formatting while typing.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (serialized !== lastSent.current) {
      setText(serialized);
      setError(null);
    }
  }, [serialized]);

  const handleChange = (value: string) => {
    setText(value);
    try {
      const parsed = parseDocument(value);
      lastSent.current = JSON.stringify(parsed, null, 2);
      setError(null);
      onChange(parsed);
    } catch (exception) {
      setError((exception as Error).message);
    }
  };

  return (
    <Stack gap={4}>
      <CodeMirror
        value={text}
        height="320px"
        theme={dark ? "dark" : "light"}
        extensions={[json()]}
        onChange={handleChange}
      />
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
