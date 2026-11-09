"use client";

import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Link } from "@tuja/next-links/link";
import { headerControlsTokens } from "@tuja/ui/components/header-controls.stylex";
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
  StripLink,
  TaskDetail,
  Tasks,
} from "./navigation-split-view-panes-specimens.tsx";
import { PARAM, useDemoHref } from "./use-demo-href.ts";
import { useDemoProjects } from "./use-demo-projects.ts";

const FRAME_BLOCK_SIZE = "26rem";
const DRAWER_FRAME_BLOCK_SIZE = "20rem";
const DRAWER_PARAM = "demo-drawer-project";

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

/** A frame as narrow as a phone, where the drawer shows, or as wide as the page. */
function DrawerFrame({ children }: { children: ReactNode }) {
  return (
    <DeviceFrame
      label={t({ en: "Width of the frame", zh: "框的宽度" })}
      sizes={[
        {
          value: "phone",
          label: t({ en: "Phone", zh: "手机" }),
          inlineSize: "24.375rem",
          blockSize: DRAWER_FRAME_BLOCK_SIZE,
        },
        {
          value: "wide",
          label: t({ en: "Wide", zh: "宽" }),
          inlineSize: "100%",
          blockSize: DRAWER_FRAME_BLOCK_SIZE,
        },
      ]}
    >
      {children}
    </DeviceFrame>
  );
}

/** The frame of `NavigationSplitViewDrawerDemo`, empty, while the page reads its URL. */
export function NavigationSplitViewDrawerDemoPlaceholder() {
  return <DeviceFramePlaceholder blockSize={DRAWER_FRAME_BLOCK_SIZE} />;
}

/**
 * The same projects with `stacked: "drawer"`, as a page of a documentation site:
 * beside the content in the wide frame, and behind a menu button in the phone
 * frame, with the title and the summary pinned in both.
 */
export function NavigationSplitViewDrawerDemo() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const projects = useDemoProjects();
  const project =
    projects.find((item) => item.id === searchParams.get(DRAWER_PARAM)) ??
    projects[0];
  const hrefOf = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(DRAWER_PARAM, id);
    return `${pathname}?${params.toString()}`;
  };
  const replace = (href: string) => {
    router.replace(href, { scroll: false });
  };
  const projectPage = (
    <div css={stack.group}>
      <Heading level={3} look="h3" css={styles.firstRow}>
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
      stage={DrawerFrame}
      caption={t({
        en: "at Phone, open the menu and pick a project",
        zh: "选择“手机”，打开菜单，再选一个项目",
      })}
    >
      <NavigationSplitView
        linkComponent={linkComponent}
        linkStatus={null}
        replace={replace}
        sidebar={{
          stacked: "drawer",
          label: t({ en: "Projects", zh: "项目" }),
          menuLabel: t({ en: "Projects menu", zh: "项目菜单" }),
          closeLabel: t({ en: "Close menu", zh: "关闭菜单" }),
          header: (
            <Text as="span" look="label">
              {t({ en: "Projects", zh: "项目" })}
            </Text>
          ),
          footer: (
            <Text as="span" look="caption" tone="muted">
              {t({ en: "Three projects", zh: "三个项目" })}
            </Text>
          ),
          node: (
            <nav aria-label={t({ en: "Projects", zh: "项目" })}>
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
  const projectTiles = (
    <ul role="list" css={[stack.tight, styles.strip]}>
      <StripLink
        href={hrefOf(null)}
        label={overviewLabel}
        icon={SquaresFourIcon}
        shared="overview"
        current={project === null}
      />
      {projects.map((item) => (
        <StripLink
          key={item.id}
          href={hrefOf(item.id)}
          label={item.name}
          icon={item.icon}
          shared={`project:${item.id}`}
          current={item === project}
        />
      ))}
    </ul>
  );
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
          stacked: "hidden",
          label: t({ en: "Projects", zh: "项目" }),
          node: projectRows,
          collapsed: projectTiles,
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

const styles = stylex.create({
  // The menu button floats over the corner of the first row.
  firstRow: {
    paddingInlineEnd: headerControlsTokens.inlineEndClearance,
  },
  strip: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
});
