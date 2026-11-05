import { useReplicaStore } from "../replica/use-replica-store.ts";
import type { LabelMark } from "./field-label.tsx";
import { TagPicker } from "./tag-picker.tsx";
import type { EditorData } from "./use-editor-data.ts";

export function TagPickerSlot({
  data,
  value,
  mark,
  onChange,
}: {
  data: EditorData;
  value: readonly string[];
  mark?: LabelMark;
  onChange: (tagIds: string[]) => void;
}) {
  const store = useReplicaStore();
  return (
    <TagPicker
      tags={data.tags}
      value={value}
      mark={mark}
      onChange={onChange}
      onCreate={(name) => {
        const id = crypto.randomUUID();
        store.applyLocal({
          name: "upsertTag",
          args: { id, name: name.slice(0, 200), position: data.tags.length },
        });
        return id;
      }}
    />
  );
}
