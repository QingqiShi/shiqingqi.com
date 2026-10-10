import { useStoredIds } from "./use-stored-ids.ts";

/** The Groups this device keeps folded on the Net worth list. */
export function useCollapsedGroups() {
  const [ids, setIds] = useStoredIds("finance:collapsed-groups");
  const collapsed: ReadonlySet<string> = new Set(ids);
  const toggle = (groupId: string, open: boolean) => {
    const next = new Set(collapsed);
    if (open) next.delete(groupId);
    else next.add(groupId);
    setIds([...next]);
  };
  return { collapsed, toggle };
}
