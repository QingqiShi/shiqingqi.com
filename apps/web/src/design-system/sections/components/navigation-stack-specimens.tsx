"use client";

import { t } from "@tuja/i18n";
import { Link } from "@tuja/next-links/link";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";
import { DeviceFrame, DeviceFramePlaceholder } from "./device-frame.tsx";
import { useDemoProjects } from "./use-demo-projects.ts";

const FRAME_BLOCK_SIZE = "22rem";
const PARAM = "demo-stack-project";

/** A link that keeps the page where it is, so a pick does not scroll the doc page. */
function DemoLink(props: ComponentProps<"a"> & { href: string }) {
  return <Link {...props} scroll={false} />;
}

// The specimen source plugin prints each component that the code names. This
// lower-case name keeps the link of this site out of the shown code.
const linkComponent = DemoLink;

function StackFrame({ children }: { children: ReactNode }) {
  return (
    <DeviceFrame
      label={t({ en: "Width of the frame", zh: "框的宽度" })}
      sizes={[
        {
          value: "phone",
          label: t({ en: "Phone", zh: "手机" }),
          inlineSize: "24.375rem",
          blockSize: FRAME_BLOCK_SIZE,
        },
        {
          value: "wide",
          label: t({ en: "Wide", zh: "宽" }),
          inlineSize: "100%",
          blockSize: FRAME_BLOCK_SIZE,
        },
      ]}
    >
      {children}
    </DeviceFrame>
  );
}

/** The frame of `NavigationStackDemo`, empty, while the page reads its URL. */
export function NavigationStackDemoPlaceholder() {
  return <DeviceFramePlaceholder blockSize={FRAME_BLOCK_SIZE} />;
}

/**
 * Two screens of one stack: the projects, and one project with the way back.
 * Each screen is a `NavigationStack` of its own, as each page of a router is.
 */
export function NavigationStackDemo() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const projects = useDemoProjects();
  const project =
    projects.find((item) => item.id === searchParams.get(PARAM)) ?? null;
  const hrefOf = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id === null) params.delete(PARAM);
    else params.set(PARAM, id);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const replace = (href: string) => {
    router.replace(href, { scroll: false });
  };
  const projectsLabel = t({ en: "Projects", zh: "项目" });
  return (
    <Specimen
      stage={StackFrame}
      caption={t({
        en: "pick a project, then go back",
        zh: "选一个项目，再返回",
      })}
    >
      {project === null ? (
        <NavigationStack
          key="projects"
          label={projectsLabel}
          linkComponent={linkComponent}
          replace={replace}
        >
          <Heading level={3} look="h3">
            {projectsLabel}
          </Heading>
          <List>
            {projects.map((item) => (
              <ListRow
                key={item.id}
                href={hrefOf(item.id)}
                linkComponent={linkComponent}
                detail={item.tasks[0].title}
              >
                {item.name}
              </ListRow>
            ))}
          </List>
        </NavigationStack>
      ) : (
        <NavigationStack
          key={project.id}
          label={project.name}
          back={{ href: hrefOf(null), label: projectsLabel }}
          linkComponent={linkComponent}
          replace={replace}
        >
          <Heading level={3} look="h3">
            {project.name}
          </Heading>
          <List>
            {project.tasks.map((item) => (
              <ListRow key={item.id} detail={item.due}>
                {item.title}
              </ListRow>
            ))}
          </List>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Swipe from the start edge on a phone to go back.",
              zh: "在手机上从起始边缘滑动即可返回。",
            })}
          </Text>
        </NavigationStack>
      )}
    </Specimen>
  );
}
