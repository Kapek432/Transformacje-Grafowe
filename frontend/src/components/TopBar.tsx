import { Alert, Button, FileButton, Group, Menu, Modal, Select, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy, IconDownload, IconFilePlus, IconTopologyStar3, IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import { ApiError, type ExportFormat } from "../api";
import { parseDocument } from "../lib/parse";
import type { DpoDocument } from "../lib/types";
import { ColorSchemeToggle } from "./ColorSchemeToggle";

const EXAMPLE_NAME = /^[A-Za-z0-9_-]{1,64}$/;

interface Props {
  examples: string[];
  current: string | null;
  canDownload: boolean;
  onSelectExample: (name: string) => void;
  onNew: () => void;
  onSave: (name: string, overwrite: boolean) => Promise<void>;
  onUpload: (doc: DpoDocument) => void;
  onDownload: (format: ExportFormat) => void;
}

export function TopBar(props: Props) {
  const { examples, current, canDownload, onSelectExample, onNew, onSave, onUpload, onDownload } = props;
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (overwrite: boolean) => {
    setSaving(true);
    try {
      await onSave(name.trim(), overwrite);
      close();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConfirmOverwrite(true);
      else notifications.show({ color: "red", title: "Nie zapisano", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      onUpload(parseDocument(await file.text()));
    } catch (error) {
      notifications.show({ color: "red", title: "Nie wczytano pliku", message: (error as Error).message });
    }
  };

  return (
    <>
      <Group h="100%" px="md" justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="gradient" size="lg" radius="md">
            <IconTopologyStar3 size={20} />
          </ThemeIcon>
          <div>
            <Title order={4}>Transformacje grafowe DPO</Title>
            <Text size="xs" c="dimmed">
              Double Pushout krok po kroku
            </Text>
          </div>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Select
            placeholder="Wybierz przykład"
            data={examples}
            value={current}
            onChange={(value) => value && onSelectExample(value)}
            allowDeselect={false}
            searchable
            w={200}
          />
          <Button variant="default" leftSection={<IconFilePlus size={16} />} onClick={onNew}>
            Nowy
          </Button>
          <Button
            variant="default"
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={() => {
              setName(current ?? "");
              setConfirmOverwrite(false);
              open();
            }}
          >
            Zapisz
          </Button>
          <FileButton accept="application/json,.json" onChange={handleFile}>
            {(buttonProps) => (
              <Button variant="default" leftSection={<IconUpload size={16} />} {...buttonProps}>
                Wgraj JSON
              </Button>
            )}
          </FileButton>
          <Menu>
            <Menu.Target>
              <Button leftSection={<IconDownload size={16} />} disabled={!canDownload}>
                Pobierz wynik
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => onDownload("json")}>JSON</Menu.Item>
              <Menu.Item onClick={() => onDownload("csv")}>CSV (zip)</Menu.Item>
              <Menu.Item onClick={() => onDownload("excel")}>Excel</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <ColorSchemeToggle />
        </Group>
      </Group>
      <Modal opened={opened} onClose={close} title="Zapisz przykład">
        <Stack>
          <TextInput
            label="Nazwa pliku w katalogu examples"
            description="Litery, cyfry, _ i -"
            value={name}
            onChange={(event) => {
              setName(event.currentTarget.value);
              setConfirmOverwrite(false);
            }}
            data-autofocus
          />
          {confirmOverwrite && (
            <Alert color="yellow" title="Plik już istnieje">
              Przykład o tej nazwie już istnieje. Nadpisać go?
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Anuluj
            </Button>
            {confirmOverwrite ? (
              <Button color="yellow" loading={saving} onClick={() => submit(true)}>
                Nadpisz
              </Button>
            ) : (
              <Button loading={saving} disabled={!EXAMPLE_NAME.test(name.trim())} onClick={() => submit(false)}>
                Zapisz
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
