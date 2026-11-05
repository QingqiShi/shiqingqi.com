"use client";

import type { Icon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import {
  SplitViewLink,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import { useDemoHref } from "./use-demo-href.ts";
import type { DemoProject, DemoTask } from "./use-demo-projects.ts";

export function Overview({ projects }: { projects: DemoProject[] }) {
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

export function Tasks({
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

export function TaskDetail({
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

export function StripLink({
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

export function ProjectMark({
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

export function Count({ children }: { children: number }) {
  return <span css={[typeRole.bodySmall, styles.count]}>{children}</span>;
}

const styles = stylex.create({
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
