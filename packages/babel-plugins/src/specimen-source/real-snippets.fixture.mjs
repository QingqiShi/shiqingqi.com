// Snippets copied from the design-system pages, so the tokeniser is measured
// against the source it actually has to read.

export const realSnippets = [
  // components/avatar-showcase.tsx
  `import { Avatar } from "@tuja/ui/components/avatar";

// Monogram derived from the name.
<Avatar name="Ada Lovelace" />

// Portrait plus a badge, whose meaning rides on badgeLabel rather than
// on name — so the monogram and the announcement stay correct.
<Avatar
  src={person.photoUrl}
  name={person.name}
  badge={<AirplaneTakeoffIcon weight="bold" />}
  badgeLabel={t({ en: "departing", zh: "出发" })}
/>`,

  // components/badge-showcase.tsx
  `import { Badge } from "@tuja/ui/components/badge";

<Badge variant="success" icon={<CheckIcon weight="bold" />}>
  Verified
</Badge>`,

  // components/breadcrumb-showcase.tsx
  `import {
  Breadcrumb,
  type BreadcrumbLinkProps,
} from "@tuja/ui/components/breadcrumb";
import Link from "next/link";

// The last item is the current page — it renders as text, never as a link.
<Breadcrumb
  label="Breadcrumb"
  items={[
    { label: "Home", href: "/" },
    { label: "Design system", href: "/design-system" },
    { label: "Breadcrumb" },
  ]}
/>

// Client-side navigation: forward className and style onto the anchor.
function RouterLink({ href, children, className, style }: BreadcrumbLinkProps) {
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

<Breadcrumb label="Breadcrumb" items={items} linkComponent={RouterLink} />`,

  // components/button-showcase.tsx
  `import { Button } from "@tuja/ui/components/button";

<Button variant="primary" icon={<PlusIcon weight="bold" />}>
  Add to list
</Button>

// A form submit: the label holds still while the spinner takes the
// icon's place, and the button disables itself until the action settles.
<Button type="submit" variant="primary" loading={isPending}>
  Save changes
</Button>`,

  // components/callout-showcase.tsx
  `import { Callout } from "@tuja/ui/components/callout";

<Callout variant="success" title="Saved">
  Your profile changes are live.
</Callout>`,

  // components/card-showcase.tsx
  `import { Card } from "@tuja/ui/components/card";

// A static surface — a panel, an alert, a list item.
<Card role="alert">Heads up.</Card>

// With the slots, for a card that has a title block and actions.
import {
  CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@tuja/ui/components/card";

<Card>
  <CardHeader action={<Badge variant="success">Released</Badge>}>
    <CardTitle>Typography</CardTitle>
    <CardDescription>Families, the type scale, weights.</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter><Button size="sm">Watch</Button></CardFooter>
</Card>

// When the whole card is clickable, render a real anchor or button and
// compose the surface from the escape-hatch styles.
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";

<Link
  href={href}
  css={[transition.colors, cardSurface.base, cardSurface.interactive]}
>
  …
</Link>`,

  // components/checkbox-showcase.tsx
  `import { Checkbox } from "@tuja/ui/components/checkbox";

<Checkbox
  label="Email me about product updates"
  description="Roughly one message a month."
  defaultChecked
/>`,

  // components/chip-showcase.tsx
  `import { Chip } from "@tuja/ui/components/chip";

// A selectable filter — renders a <button> with aria-pressed.
<Chip isActive={active} onClick={toggle}>Now playing</Chip>

// A shortcut — renders a real <a>.
<Chip href="/movies/now-playing">Now playing</Chip>

// For a framework <Link>, compose the surface directly.
import { chipSize, chipSurface } from "@tuja/ui/components/chip.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";

<Link
  href={href}
  css={[chipSurface.base, chipSize.md, chipSurface.interactive, transition.colors]}
>
  …
</Link>`,

  // components/disclosure-showcase.tsx
  `import { Disclosure } from "@tuja/ui/components/disclosure";

<Disclosure variant="card" summary="Packing list" trailing={<Badge>2/5</Badge>}>
  <ChecklistItems items={items} />
</Disclosure>

// When the header holds its own control, drop to the hook.
import { useDisclosure } from "@tuja/ui/hooks/use-disclosure";

const { open, triggerProps, panelProps } = useDisclosure();

<li>
  <a href={route.href}>{route.label}</a>
  <button {...triggerProps}>Map</button>
  <div {...panelProps}>{open ? <MapEmbed src={route.src} /> : null}</div>
</li>`,

  // components/divider-showcase.tsx
  `import { Divider } from "@tuja/ui/components/divider";

<Divider variant="subtle" />`,

  // components/header-footer-layout-showcase.tsx
  `import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";

<HeaderFooterLayout
  headerStart={<BackButton />}
  headerEnd={<ThemeSwitch />}
  background={<FlowGradient />}
  footer={<SiteFooter />}
  readingColumn
>
  <Article />
</HeaderFooterLayout>`,

  // components/heading-showcase.tsx
  `import { Heading } from "@tuja/ui/components/heading";

// Semantic <h2>, display-scale look
<Heading level={2} variant="display">
  Featured this week
</Heading>

// A title that wraps to two lines without stranding a word on the second
<Heading level={1} wrap="balance">
  {movie.title}
</Heading>`,

  // components/menu-showcase.tsx
  `import { MenuButton } from "@tuja/ui/components/menu-button";

// Anything focusable that carries role="menuitem" joins the keyboard model.
<MenuButton
  buttonProps={{ icon: <DotsThreeIcon weight="bold" /> }}
  menuContent={
    <div role="none">
      <a role="menuitem" href={detailsHref} data-menu-autofocus="true">
        Details
      </a>
      <a role="menuitem" href={creditsHref}>
        Cast & crew
      </a>
    </div>
  }
>
  More
</MenuButton>`,

  // components/menu-showcase.tsx
  `import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuLabel } from "@tuja/ui/components/menu-label";

// Controls rather than commands: opt out of the menu keyboard model.
<MenuButton
  buttonProps={{ icon: <FunnelIcon weight="bold" /> }}
  popupRole="group"
  menuContent={
    <div>
      <MenuLabel>Sort by</MenuLabel>
      <Button variant="primary">Newest</Button>
      <Button>Popular</Button>
    </div>
  }
>
  Filters
</MenuButton>`,

  // components/option-card-showcase.tsx
  `import { OptionCardGroup } from "@tuja/ui/components/option-card";
import { useState } from "react";

const [plan, setPlan] = useState<"free" | "pro">("free");

<OptionCardGroup
  aria-label="Plan"
  value={plan}
  onChange={setPlan}
  options={[
    { value: "free", label: "Free", description: "One project." },
    { value: "pro", label: "Pro", description: "Unlimited projects." },
  ]}
/>

// Independent toggles: every card becomes a checkbox with its own tab stop.
<OptionCardGroup
  selection="multiple"
  aria-label="Add-ons"
  value={addOns}
  onChange={setAddOns}
  options={addOnOptions}
/>

// A card carrying bespoke content drops a layer: render OptionCard
// yourself and keep the group's keyboard model with the same hook.
import { OptionCard } from "@tuja/ui/components/option-card";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";`,

  // components/overlay-showcase.tsx
  `import { Overlay } from "@tuja/ui/components/overlay";
import { useState } from "react";

const [isOpen, setIsOpen] = useState(false);

<Overlay
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  closeLabel="Close"
  aria-label="Trailer"
>
  {/* content */}
</Overlay>`,

  // components/popover-showcase.tsx
  `import { Button } from "@tuja/ui/components/button";
import { Popover } from "@tuja/ui/components/popover";

<Popover
  placement="bottom-start"
  trigger={(triggerProps) => (
    <Button {...triggerProps}>Repayment sources</Button>
  )}
>
  <p>Collected through PAYE, alongside income tax.</p>
</Popover>`,

  // components/progress-showcase.tsx
  `import { Progress } from "@tuja/ui/components/progress";

// A percentage of a known total:
<Progress label="Upload progress" value={uploadedPercent} />

// A count, with the words a screen reader should say instead:
<Progress label="Checkout" value={3} max={5} aria-valuetext="Step 3 of 5" />`,

  // components/progress-showcase.tsx
  `<Progress label="Checkout" value={3} max={5} aria-valuetext="Step 3 of 5" />

// renders

<div
  role="progressbar"
  aria-label="Checkout"
  aria-valuenow="3"
  aria-valuemin="0"
  aria-valuemax="5"
  aria-valuetext="Step 3 of 5"
/>`,

  // components/section-showcase.tsx
  `import { Section } from "@tuja/ui/components/section";

<Section title="Cast & crew" icon={<UsersIcon weight="bold" />}>
  <CastList people={people} />
</Section>

// Deeper in the outline, ruled off from the section before it.
<Section title="Similar titles" level={4} divider>
  <SimilarList items={items} />
</Section>`,

  // components/segmented-control-showcase.tsx
  `import { SegmentedControl } from "@tuja/ui/components/segmented-control";

const [view, setView] = useState<"grid" | "list">("grid");

<SegmentedControl
  aria-label="View"
  value={view}
  onChange={setView}
  options={[
    { value: "grid", label: "Grid" },
    { value: "list", label: "List" },
  ]}
/>

// For an option row that needs its own layout, use the hook the
// control is built on and keep the same keyboard model.
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";`,

  // components/select-showcase.tsx
  `import { Select } from "@tuja/ui/components/select";

<Select
  label="Sort by"
  placeholder="Choose an order"
  options={[
    { value: "newest", label: "Newest" },
    { value: "top", label: "Top rated" },
  ]}
/>`,

  // components/sidebar-layout-showcase.tsx
  `import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";

<SidebarLayout
  sidebar={<LibraryNav />}
  sidebarHeader={<Wordmark />}
  sidebarFooter={<UtilityControls />}
  menuLabel={menuLabel}
  closeLabel={closeMenuLabel}
>
  <LibraryContent />
</SidebarLayout>`,

  // components/skeleton-showcase.tsx
  `import { Skeleton } from "@tuja/ui/components/skeleton";

<Skeleton width="100%" height={160} />`,

  // components/slider-showcase.tsx
  `import { Slider } from "@tuja/ui/components/slider";
import { useState } from "react";

const [rate, setRate] = useState(4.25);
const percent = new Intl.NumberFormat(locale, {
  style: "percent",
  minimumFractionDigits: 2,
});

<Slider
  label="Interest rate"
  min={1}
  max={9}
  step={0.25}
  value={rate}
  onChange={setRate}
  onCommit={(committed) => {
    recalculateSchedule(committed);
  }}
  readout={percent.format(rate / 100)}
/>`,

  // components/spinner-showcase.tsx
  `import { Spinner } from "@tuja/ui/components/spinner";

// Standalone — announces its busy state:
<Spinner label="Loading" />

// Decorative — inside an already-labelled busy region:
<button aria-busy>
  <Spinner aria-hidden /> Saving…
</button>`,

  // components/switch-showcase.tsx
  `import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { useState } from "react";

const [state, setState] = useState<SwitchState>("off");

<Switch value={state} onChange={setState} aria-label="Reduce motion" />`,

  // components/table-showcase.tsx
  `import {
  Table, TableBody, TableCell, TableFoot, TableHead, TableHeaderCell, TableRow,
} from "@tuja/ui/components/table";

<Table
  caption="UK student loan repayment plans, 2025/26"
  stickyHeader
  containerCss={styles.region}
>
  <TableHead>
    <TableRow>
      <TableHeaderCell scope="col">Plan</TableHeaderCell>
      <TableHeaderCell scope="col" numeric>Threshold</TableHeaderCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow current>
      <TableHeaderCell scope="row">Plan 2</TableHeaderCell>
      <TableCell numeric>£28,470</TableCell>
    </TableRow>
  </TableBody>
  <TableFoot>
    <TableRow>
      <TableHeaderCell scope="row">Across all plans</TableHeaderCell>
      <TableCell numeric>£21,000 – £32,745</TableCell>
    </TableRow>
  </TableFoot>
</Table>

// The head sticks to the container, so the container is what needs a height.
const styles = stylex.create({ region: { blockSize: space._13 } });`,

  // components/text-field-showcase.tsx
  `import { TextField } from "@tuja/ui/components/text-field";

<TextField
  label="Email"
  type="email"
  placeholder="you@example.com"
  description="We'll only use this to send receipts."
/>`,

  // components/text-showcase.tsx
  `import { Text } from "@tuja/ui/components/text";

<Text variant="bodySmall" tone="muted">
  2h 08m · Crime, Drama
</Text>

// Body copy that shouldn't strand a word, and a column of times
// whose digits line up.
<Text wrap="pretty">{overview}</Text>
<Text numeric align="end">{runtime}</Text>`,

  // components/textarea-showcase.tsx
  `import { Textarea } from "@tuja/ui/components/textarea";

<Textarea
  label="Review"
  autoGrow
  description="Grows to fit as you type."
  placeholder="Share your thoughts…"
/>`,

  // examples/movie-detail-showcase.tsx
  `// A sketch of the shape, not a transcript of the screen — the source is
// movie-detail-screen.tsx, and a second full copy here would only drift.
//
// What it shows: local styles carry the grid and the plate width; the surface
// comes from the system's shared skin; everything inside is a component and
// its props.
<div css={[cardSurface.base, styles.screen]}>
  <div css={styles.hero}>
    <TypesetPoster
      title={movie.title}
      studio={movie.studio}
      year={movie.year}
      credit={movie.director}
      lead
      css={styles.heroPoster}
    />
    <div css={styles.identity}>
      <div css={styles.controlRow}>
        <Badge variant="accent">Movie</Badge>
        <Text as="span" variant="caption" tone="subtle" numeric>
          {[movie.year, movie.runtime, movie.language].join(" · ")}
        </Text>
      </div>
      <Heading level={3} variant="h1" wrap="balance">{movie.title}</Heading>
      <Text tone="muted" wrap="pretty" css={styles.tagline}>{movie.tagline}</Text>
    </div>
    <div css={styles.heroRest}>
      <div css={styles.badgeRow}>
        {movie.genres.map((genre) => <Badge key={genre} size="small">{genre}</Badge>)}
      </div>
      <div css={styles.controlRow}>
        <Button variant="primary" icon={<PlayIcon weight="fill" />} onClick={openTrailer}>
          Watch trailer
        </Button>
        <MenuButton
          buttonProps={{ variant: "outline", icon: <ShareNetworkIcon weight="bold" /> }}
          menuContent={shareItems.map((item) => (
            <Button key={item.label} role="menuitem" variant="ghost" icon={item.icon}>
              {item.label}
            </Button>
          ))}
        >
          Share
        </MenuButton>
      </div>
    </div>
  </div>
</div>`,

  // hooks/hooks-showcase.tsx
  `import { useControlled } from "@tuja/ui/hooks/use-controlled";

// [value, setValue] = useControlled({ controlled, defaultValue })
function Stepper({ value, defaultValue = 0, onChange }) {
  const [count, setCount] = useControlled({ controlled: value, defaultValue });
  const commit = (next) => { setCount(next); onChange?.(next); };
  // render count, calling commit on +/-
}`,

  // hooks/hooks-showcase.tsx
  `import { useRef, useState } from "react";
import { useDialogFocus } from "@tuja/ui/hooks/use-dialog-focus";

const dialogRef = useRef(null);
useDialogFocus({ isOpen, dialogRef, onClose: () => setOpen(false) });

<div role="dialog" aria-modal="true" ref={dialogRef}>
  {/* Tab trap, Escape-to-close, focus restore all handled */}
</div>`,

  // hooks/hooks-showcase.tsx
  `import { usePopover } from "@tuja/ui/hooks/use-popover";

// placement defaults to "bottom-start", offset to 8
const { open, setOpen, toggle, triggerProps, contentProps } = usePopover({
  placement: "top-start",
});

<button {...triggerProps}>What is this?</button>
{open ? (
  // position: fixed — the hook writes top/left onto this node
  <div {...contentProps} css={styles.popup}>{/* your markup */}</div>
) : null}`,

  // hooks/hooks-showcase.tsx
  `import { useRef } from "react";
import { usePressHandlers } from "@tuja/ui/hooks/use-press-handlers";

const ref = useRef(null);
const { isPressed, pressedStyle, handlers } = usePressHandlers({
  targetRef: ref,
  onClick,
});

<button ref={ref} {...handlers} style={pressedStyle}
  css={[isPressed && styles.pressed]} />`,

  // hooks/hooks-showcase.tsx
  `import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";

const { getOptionProps } = useRadioGroup({ values, value, onChange });

<div role="radiogroup" aria-label="View density">
  {values.map((v) => (
    <button key={v} {...getOptionProps(v)}>{labels[v]}</button>
  ))}
</div>`,

  // primitives/primitives-showcase.tsx
  `import { flex, align, grow } from "@tuja/ui/primitives/flex.stylex";

<header css={flex.between}>…</header>
<div css={[flex.row, align.end]}>…</div>
<div css={[flex.row, grow._1]}>…</div>`,

  // primitives/primitives-showcase.tsx
  `import { truncate, absoluteFill, imageCover } from "@tuja/ui/primitives/layout.stylex";

<span css={truncate.base}>{longTitle}</span>
<div css={absoluteFill.all}>{scrim}</div>
<img css={imageCover.base} src={src} alt={alt} />`,

  // primitives/primitives-showcase.tsx
  `import { transition, animate } from "@tuja/ui/primitives/motion.stylex";

<a css={transition.colors}>…</a>
<div css={animate.fadeIn}>…</div>`,

  // primitives/primitives-showcase.tsx
  `import { buttonReset } from "@tuja/ui/primitives/reset.stylex";

<button type="button" css={[buttonReset.base, styles.control]}>
  {icon}
  {label}
</button>`,

  // primitives/primitives-showcase.tsx
  `import { a11y } from "@tuja/ui/primitives/a11y.stylex";

<button css={a11y.focusRing}>
  {icon}
  <span css={a11y.srOnly}>{accessibleName}</span>
</button>`,

  // tokens/accessibility-showcase.tsx
  `// The union is the enforcement: one of the two, never neither.
type Named =
  | { "aria-label": string; "aria-labelledby"?: undefined }
  | { "aria-labelledby": string; "aria-label"?: undefined };

// Building your own control? srOnly names it.
<button css={a11y.focusRing}>
  <TrashIcon aria-hidden />
  <span css={a11y.srOnly}>Delete</span>
</button>`,

  // tokens/borders-showcase.tsx
  `import { border } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  card: {
    borderWidth: border.size_1,        // hairline surface edge
    borderRadius: border.radius_3,     // 1rem card corner
  },
  pill: { borderRadius: border.radius_round },
});`,

  // tokens/iconography-showcase.tsx
  `// Import from the SSR entry so only this icon ships to the client.
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";

// Decorative beside text — hide it from assistive tech.
<Button icon={<PlusIcon weight="bold" aria-hidden />}>Add</Button>

// Sizes with font-size; colour follows currentColor.
<span css={styles.iconSlot}>
  <PlusIcon />
</span>`,

  // tokens/layout-showcase.tsx
  `import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { layout, layer, ratio } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  page: { maxInlineSize: layout.maxInlineSize, marginInline: "auto" },
  // Mobile-first: base value, then override up at each breakpoint.
  grid: {
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "1fr 1fr" },
  },
  poster: { aspectRatio: ratio.poster },
  toast: { zIndex: layer.toaster },
});`,

  // tokens/motion-showcase.tsx
  `import { transition, animate } from "@tuja/ui/primitives/motion.stylex";

// Timing on a state change — the preset animates hover/focus/selected.
<button css={[transition.colors, styles.row]}>…</button>

// A keyframe entrance — reduced-motion fallbacks ship in the preset.
<div css={animate.slideUp}>…</div>`,

  // tokens/voice-showcase.tsx
  `<TextField
  label="Display name"                             // what is this
  description="Shown on anything you make public." // what to know first
  error="That name is taken. Try another."         // what to do now
/>`,
];
