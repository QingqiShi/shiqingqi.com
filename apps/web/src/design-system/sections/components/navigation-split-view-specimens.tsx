"use client";

import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { t } from "@tuja/i18n";
import { Link } from "@tuja/next-links/link";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import {
  NavigationSplitView,
  SplitViewLink,
} from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";
import { DeviceFrame, DeviceFramePlaceholder } from "./device-frame.tsx";
import {
  Count,
  Overview,
  ProjectMark,
  TaskDetail,
  Tasks,
} from "./navigation-split-view-panes-specimens.tsx";
import { PARAM, useDemoHref } from "./use-demo-href.ts";
import { useDemoProjects } from "./use-demo-projects.ts";

const FRAME_BLOCK_SIZE = "26rem";
const LANDING_FRAME_BLOCK_SIZE = "20rem";
const LANDING_PARAM = "demo-landing-project";
const LIST = "list";

/** A link that keeps the page where it is, so a pick does not scroll the doc page. */
function DemoLink(props: ComponentProps<"a"> & { href: string }) {
  return <Link {...props} scroll={false} />;
}

// The specimen source plugin prints each component that the code names. This
// lower-case name keeps the link of this site out of the shown code.
const linkComponent = DemoLink;

/** A frame of each width that the three columns have a form for. */
function ProjectsFrame({ children }: { children: ReactNode }) {
  return (
    <DeviceFrame
      label={t({ en: "Width of the frame", zh: "框的宽度" })}
      sizes={[
        {
          value: "wide",
          label: t({ en: "Wide", zh: "宽" }),
          inlineSize: "100%",
          blockSize: FRAME_BLOCK_SIZE,
        },
        {
          value: "medium",
          label: t({ en: "Medium", zh: "中" }),
          inlineSize: "40rem",
          blockSize: FRAME_BLOCK_SIZE,
        },
        {
          value: "phone",
          label: t({ en: "Phone", zh: "手机" }),
          inlineSize: "24.375rem",
          blockSize: FRAME_BLOCK_SIZE,
        },
      ]}
    >
      {children}
    </DeviceFrame>
  );
}

/** A frame as narrow as a phone, where the page shows alone, or as wide as the page. */
function LandingFrame({ children }: { children: ReactNode }) {
  return (
    <DeviceFrame
      label={t({ en: "Width of the frame", zh: "框的宽度" })}
      sizes={[
        {
          value: "phone",
          label: t({ en: "Phone", zh: "手机" }),
          inlineSize: "24.375rem",
          blockSize: LANDING_FRAME_BLOCK_SIZE,
        },
        {
          value: "wide",
          label: t({ en: "Wide", zh: "宽" }),
          inlineSize: "100%",
          blockSize: LANDING_FRAME_BLOCK_SIZE,
        },
      ]}
    >
      {children}
    </DeviceFrame>
  );
}

/** The frame of `NavigationSplitViewLandingDemo`, empty, while the page reads its URL. */
export function NavigationSplitViewLandingDemoPlaceholder() {
  return <DeviceFramePlaceholder blockSize={LANDING_FRAME_BLOCK_SIZE} />;
}

/**
 * The same projects as a documentation site, with no app navigation around
 * the view: the visitor lands on a page, which has a back link to the list.
 * In the wide frame the list is the sidebar, with a title, a summary and a
 * button that collapses it.
 */
export function NavigationSplitViewLandingDemo() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const projects = useDemoProjects();
  const picked = searchParams.get(LANDING_PARAM);
  const isList = picked === LIST;
  const project = projects.find((item) => item.id === picked) ?? projects[0];
  const hrefOf = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(LANDING_PARAM, id);
    return `${pathname}?${params.toString()}`;
  };
  const replace = (href: string) => {
    router.replace(href, { scroll: false });
  };
  const projectsLabel = t({ en: "Projects", zh: "项目" });
  const projectPage = (
    <div css={stack.group}>
      <Heading level={3} look="h3">
        {project.name}
      </Heading>
      {project.tasks.map((item) => (
        <Text key={item.id} as="p">
          {item.title}
        </Text>
      ))}
    </div>
  );
  return (
    <Specimen
      stage={LandingFrame}
      caption={t({
        en: "at Phone, go back to the list and pick a project",
        zh: "选择“手机”，返回列表，再选一个项目",
      })}
    >
      <NavigationSplitView
        linkComponent={linkComponent}
        linkStatus={null}
        replace={replace}
        sidebar={{
          href: hrefOf(LIST),
          label: projectsLabel,
          toggleLabel: t({ en: "Sidebar", zh: "侧边栏" }),
          header: (
            <Text as="span" look="label">
              {projectsLabel}
            </Text>
          ),
          footer: (
            <Text as="span" look="caption" tone="muted">
              {t({ en: "Three projects", zh: "三个项目" })}
            </Text>
          ),
          node: (
            <nav aria-label={projectsLabel}>
              <NavList linkComponent={SplitViewLink}>
                {projects.map((item) => (
                  <NavLink
                    key={item.id}
                    href={hrefOf(item.id)}
                    current={item === project}
                  >
                    {item.name}
                  </NavLink>
                ))}
              </NavList>
            </nav>
          ),
        }}
        content={{
          label: project.name,
          key: project.id,
          back: isList ? null : { href: hrefOf(LIST), label: projectsLabel },
          node: projectPage,
        }}
      />
    </Specimen>
  );
}

/** The frame of `NavigationSplitViewDemo`, empty, while the page reads its URL. */
export function NavigationSplitViewDemoPlaceholder() {
  return <DeviceFramePlaceholder blockSize={FRAME_BLOCK_SIZE} />;
}

/**
 * A small to-do app: projects in the sidebar, the overview or one project's
 * tasks in the content, and the picked task in the detail. The links put the
 * picks in the URL, so the view holds no state of its own.
 */
export function NavigationSplitViewDemo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hrefOf = useDemoHref();
  const projects = useDemoProjects();
  const project =
    projects.find((item) => item.id === searchParams.get(PARAM.project)) ??
    null;
  const task =
    project?.tasks.find((item) => item.id === searchParams.get(PARAM.task)) ??
    null;
  const overviewLabel = t({ en: "Overview", zh: "总览" });
  const replace = (href: string) => {
    router.replace(href, { scroll: false });
  };
  const projectRows = (
    <div css={stack.item}>
      <Text look="overline" tone="muted">
        {t({ en: "Projects", zh: "项目" })}
      </Text>
      <List>
        <ListRow
          href={hrefOf(null)}
          linkComponent={SplitViewLink}
          aria-current={project === null ? "page" : undefined}
          caret={false}
          leading={<ProjectMark icon={SquaresFourIcon} shared="overview" />}
        >
          {overviewLabel}
        </ListRow>
        {projects.map((item) => (
          <ListRow
            key={item.id}
            href={hrefOf(item.id)}
            linkComponent={SplitViewLink}
            aria-current={item === project ? "page" : undefined}
            caret={false}
            leading={
              <ProjectMark icon={item.icon} shared={`project:${item.id}`} />
            }
            trailing={<Count>{item.tasks.length}</Count>}
          >
            {item.name}
          </ListRow>
        ))}
      </List>
    </div>
  );
  const overview = <Overview projects={projects} />;
  const taskRows =
    project === null ? null : <Tasks project={project} task={task} />;
  const taskDetail =
    project === null || task === null ? null : (
      <TaskDetail project={project} task={task} />
    );

  return (
    <Specimen
      stage={ProjectsFrame}
      caption={t({
        en: "pick a project, then a task, at each width",
        zh: "在每种宽度下选一个项目，再选一个任务",
      })}
    >
      <NavigationSplitView
        linkComponent={linkComponent}
        linkStatus={null}
        replace={replace}
        sidebar={{
          href: hrefOf(null),
          label: t({ en: "Projects", zh: "项目" }),
          node: projectRows,
        }}
        content={{
          label: project?.name ?? overviewLabel,
          key: project?.id ?? "overview",
          back:
            project === null
              ? null
              : { href: hrefOf(null), label: overviewLabel },
          node: taskRows ?? overview,
        }}
        detail={
          project !== null && task !== null
            ? {
                label: t({ en: "Task", zh: "任务" }),
                key: task.id,
                closeLabel: t({ en: "Close", zh: "关闭" }),
                back: { href: hrefOf(project.id), label: project.name },
                node: taskDetail,
              }
            : null
        }
      />
    </Specimen>
  );
}
