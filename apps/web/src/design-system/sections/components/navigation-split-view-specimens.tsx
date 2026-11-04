"use client";

import type { Icon } from "@phosphor-icons/react";
import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { CookingPotIcon } from "@phosphor-icons/react/dist/ssr/CookingPot";
import { PlantIcon } from "@phosphor-icons/react/dist/ssr/Plant";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { headerControlsTokens } from "@tuja/ui/components/header-controls.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import {
  NavigationSplitView,
  SplitViewLink,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, space } from "@tuja/ui/tokens.stylex";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";
import { Link } from "#src/links/link.tsx";
import { DeviceFrame, DeviceFramePlaceholder } from "./device-frame.tsx";

/** The search params the demo reads, named so they clash with nothing else on the page. */
const PARAM = { project: "demo-project", task: "demo-task" } as const;

const FRAME_BLOCK_SIZE = "26rem";
const DRAWER_FRAME_BLOCK_SIZE = "20rem";
const DRAWER_PARAM = "demo-drawer-project";

interface DemoTask {
  id: string;
  title: string;
  due: string;
  note: string;
}

interface DemoProject {
  id: string;
  name: string;
  icon: Icon;
  tasks: DemoTask[];
}

function useDemoProjects(): DemoProject[] {
  return [
    {
      id: "garden",
      name: t({ en: "Garden", zh: "花园" }),
      icon: PlantIcon,
      tasks: [
        {
          id: "bulbs",
          title: t({ en: "Plant the tulip bulbs", zh: "种下郁金香球茎" }),
          due: t({ en: "Sat 25 Oct", zh: "10月25日 周六" }),
          note: t({
            en: "Two rows along the fence, a hand deep.",
            zh: "沿篱笆种两排，深约一掌。",
          }),
        },
        {
          id: "gate",
          title: t({ en: "Fix the gate latch", zh: "修好院门的门闩" }),
          due: t({ en: "Sun 26 Oct", zh: "10月26日 周日" }),
          note: t({
            en: "The screws are in the shed.",
            zh: "螺丝在棚屋里。",
          }),
        },
        {
          id: "compost",
          title: t({ en: "Order compost", zh: "订购堆肥" }),
          due: t({ en: "Mon 27 Oct", zh: "10月27日 周一" }),
          note: t({ en: "Six bags.", zh: "六袋。" }),
        },
      ],
    },
    {
      id: "kitchen",
      name: t({ en: "Kitchen", zh: "厨房" }),
      icon: CookingPotIcon,
      tasks: [
        {
          id: "tiles",
          title: t({ en: "Choose the tiles", zh: "选定瓷砖" }),
          due: t({ en: "Fri 31 Oct", zh: "10月31日 周五" }),
          note: t({
            en: "Bring the samples home first.",
            zh: "先把样品带回家看看。",
          }),
        },
        {
          id: "plumber",
          title: t({ en: "Book the plumber", zh: "预约水管工" }),
          due: t({ en: "Mon 3 Nov", zh: "11月3日 周一" }),
          note: t({
            en: "Ask about the old pipes too.",
            zh: "顺便问问旧水管的事。",
          }),
        },
      ],
    },
    {
      id: "trip",
      name: t({ en: "Trip to Lisbon", zh: "里斯本之行" }),
      icon: AirplaneTiltIcon,
      tasks: [
        {
          id: "passports",
          title: t({ en: "Renew the passports", zh: "续办护照" }),
          due: t({ en: "Wed 5 Nov", zh: "11月5日 周三" }),
          note: t({
            en: "Photos are in the top drawer.",
            zh: "照片在最上面的抽屉里。",
          }),
        },
        {
          id: "hotel",
          title: t({ en: "Book a hotel", zh: "预订酒店" }),
          due: t({ en: "Fri 7 Nov", zh: "11月7日 周五" }),
          note: t({
            en: "Near the river, with a lift.",
            zh: "靠近河边，要有电梯。",
          }),
        },
      ],
    },
  ];
}

/** The URL of this page with the demo's params changed, for a link. */
function useDemoHref() {
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

function Overview({ projects }: { projects: DemoProject[] }) {
  const hrefOf = useDemoHref();
  return (
    <div css={stack.group}>
      <div css={stack.text}>
        <Heading level={3} look="h3">
          {t({ en: "Overview", zh: "总览" })}
        </Heading>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Seven open tasks in three projects.",
            zh: "三个项目里有七个待办任务。",
          })}
        </Text>
      </div>
      <List>
        {projects.map((item) => (
          <ListRow
            key={item.id}
            href={hrefOf(item.id)}
            linkComponent={SplitViewLink}
            leading={<ProjectMark icon={item.icon} />}
            detail={item.tasks[0].title}
            trailing={<Count>{item.tasks.length}</Count>}
          >
            {item.name}
          </ListRow>
        ))}
      </List>
    </div>
  );
}

function Tasks({
  project,
  task,
}: {
  project: DemoProject;
  task: DemoTask | null;
}) {
  const hrefOf = useDemoHref();
  return (
    <div css={stack.group}>
      <Heading level={3} look="h3">
        {project.name}
      </Heading>
      <List>
        {project.tasks.map((item) => (
          <ListRow
            key={item.id}
            href={hrefOf(project.id, item.id)}
            linkComponent={SplitViewLink}
            aria-current={item === task ? "true" : undefined}
            detail={item.due}
          >
            {item.title}
          </ListRow>
        ))}
      </List>
    </div>
  );
}

function TaskDetail({
  project,
  task,
}: {
  project: DemoProject;
  task: DemoTask;
}) {
  const facts = [
    { label: t({ en: "Project", zh: "项目" }), value: project.name },
    { label: t({ en: "Due", zh: "截止" }), value: task.due },
    { label: t({ en: "Note", zh: "备注" }), value: task.note },
  ];
  return (
    <div css={stack.group}>
      <Heading level={3} look="h3">
        {task.title}
      </Heading>
      <dl css={[stack.item, styles.facts]}>
        {facts.map((fact) => (
          <div key={fact.label} css={stack.text}>
            <dt css={[typeRole.caption, styles.term]}>{fact.label}</dt>
            <dd css={[typeRole.body, styles.value]}>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StripLink({
  href,
  label,
  icon,
  shared,
  current,
}: {
  href: string;
  label: string;
  icon: Icon;
  shared: string;
  current: boolean;
}) {
  return (
    <li css={styles.stripItem}>
      <SplitViewLink
        href={href}
        aria-label={label}
        title={label}
        aria-current={current ? "page" : undefined}
        {...stylex.props(
          corner.radius_3,
          quietSurface.interactive,
          a11y.touchTarget,
          styles.stripLink,
        )}
      >
        <ProjectMark icon={icon} shared={shared} />
      </SplitViewLink>
    </li>
  );
}

function ProjectMark({
  icon: ProjectIcon,
  shared = null,
}: {
  icon: Icon;
  shared?: string | null;
}) {
  const ref = useSplitViewShared(shared);
  return (
    <span ref={ref} css={[corner.radius_2, styles.mark]} aria-hidden>
      <ProjectIcon weight="bold" />
    </span>
  );
}

function Count({ children }: { children: number }) {
  return <span css={[typeRole.bodySmall, styles.count]}>{children}</span>;
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
  stripItem: {
    display: "flex",
    justifyContent: "center",
  },
  stripLink: {
    display: "inline-flex",
    padding: space._1,
    color: color.fg,
    textDecoration: "none",
  },
  mark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontSize: controlSize._5,
    color: color.fg,
    backgroundColor: color.bgNeutralSubtle,
  },
  count: {
    color: color.fgMuted,
  },
  facts: {
    margin: 0,
  },
  term: {
    color: color.fgMuted,
  },
  value: {
    margin: 0,
  },
});
