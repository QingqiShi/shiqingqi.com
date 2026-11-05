import { usePathname, useSearchParams } from "next/navigation";

/** The search params the demo reads, named so they clash with nothing else on the page. */
export const PARAM = { project: "demo-project", task: "demo-task" } as const;

/** The URL of this page with the demo's params changed, for a link. */
export function useDemoHref() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (project: string | null, task: string | null = null) => {
    const params = new URLSearchParams(searchParams);
    if (project === null) params.delete(PARAM.project);
    else params.set(PARAM.project, project);
    if (project === null || task === null) params.delete(PARAM.task);
    else params.set(PARAM.task, task);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
}
