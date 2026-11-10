/**
 * The hand-kept half of the agent index: which group each component belongs
 * to, in the order a screen is built, and when to reach for it. The props
 * come from the generated documents and the examples from `examples.tsx`.
 */

export interface CatalogueEntry {
  /** Export names under `@tuja/ui/components/` (or `hooks/`), the lead first. */
  names: readonly string[];
  /** When to reach for it, in one sentence. */
  when: string;
  /** What the props cannot say, such as a second export of the same path. */
  note?: string;
}

export interface PrimitiveEntry {
  /** The exported style object, such as `stack`. */
  name: string;
  /** The file under `@tuja/ui/primitives/`, without `.stylex`. */
  file: string;
  when: string;
}

export interface CatalogueGroup {
  /** The detail file's name, `components/<slug>.md`. */
  slug: string;
  title: string;
  entries: readonly CatalogueEntry[];
  primitives?: readonly PrimitiveEntry[];
}

export const catalogue: readonly CatalogueGroup[] = [
  {
    slug: "frame",
    title: "App frame and page layout",
    entries: [
      {
        names: ["tab-view", "tab-view-brand"],
        when: "The frame of an app with top-level destinations: a rail or sidebar from `md`, a tab bar below it. Wrap every screen in one.",
        note: "Give `header` a `TabViewBrand`, also exported from `tab-view`: the app's mark, name and detail line, of which the icon rail shows only the mark. `TabViewLabelsOnly` from `tab-view` shows any other children only in the labelled sidebar.",
      },
      {
        names: ["navigation-split-view"],
        when: "The columns of one screen inside a `TabView`: an optional sidebar (a list of accounts, settings sections), the content, and an optional detail. Use it with `content` alone for a one-pane screen.",
        note: 'A `"page"` sidebar or a `skeleton` needs a router: pass `linkStatus` and `skeleton`. With `linkStatus={null}`, use a `"hidden"` or `"drawer"` sidebar or a `detail`.',
      },
      {
        names: ["header-footer-layout"],
        when: "The shell of a reading page with no app frame: floating header controls at the top, the content, a footer.",
      },
      {
        names: ["sticky-controls", "sticky-control-group"],
        when: "A filter bar that sticks under the header while the page scrolls; one group per cluster of controls.",
      },
    ],
    primitives: [
      {
        name: "pageColumn",
        file: "page-column",
        when: "The page column's width. Give `pageColumn.list`, `settings` or `report` to the `css` of a `TabView` or `NavigationSplitView`; compose `base` on a box of your own.",
      },
      {
        name: "show",
        file: "show",
        when: "Show a box only on a wide `TabView` (`show.fromMd`) or only on a phone (`show.belowMd`), such as a `Table` that is a `List` on a phone. Put it on a wrapper.",
      },
      {
        name: "stack",
        file: "stack",
        when: "A column that owns the gap between its children: `section` between page blocks, `group` between cards, `item` inside a card, `tight` for a heading over its text.",
      },
      {
        name: "cluster",
        file: "stack",
        when: "A row that wraps, such as a line of badges or buttons.",
      },
      {
        name: "row",
        file: "stack",
        when: "A row that does not wrap, such as an icon beside its label or the buttons of a header.",
      },
      {
        name: "flex",
        file: "flex",
        when: "A bare flex box with no gap; change one property after it with `align`, `justify`, `grow` or `shrink` from the same file.",
      },
    ],
  },
  {
    slug: "blocks",
    title: "Page blocks",
    entries: [
      {
        names: ["page-header"],
        when: "The top of every page: eyebrow, the `<h1>`, a description and the page's own actions.",
      },
      {
        names: ["stat-group", "stat"],
        when: "Key figures in a row, such as spent, income and net, each on a card or plain inside one.",
        note: "`Stat` and `StatGroup` both import from `@tuja/ui/components/stat` too.",
      },
      {
        names: ["setting-list", "setting-row"],
        when: "A settings page: one row per setting, its name and description at the start and one control at the end.",
      },
      {
        names: ["form-footer"],
        when: "The Cancel and Save buttons at the end of a form, optionally sticky.",
      },
      {
        names: ["empty-state"],
        when: "What a list, card or page shows when it has nothing yet, with the action that fills it.",
      },
      {
        names: ["columns"],
        when: "Two or three columns side by side, such as a main column and an aside, that stack on a narrow box.",
      },
    ],
  },
  {
    slug: "surfaces",
    title: "Surfaces",
    entries: [
      {
        names: [
          "card",
          "card-header",
          "card-title",
          "card-description",
          "card-content",
          "card-footer",
        ],
        when: "A bordered surface that groups one topic. `Card` is already a `stack.item`, so put content straight in it.",
      },
      {
        names: ["section"],
        when: 'A labelled block with a heading row and optional actions, with no surface of its own: a quiet label by default, a real heading with `look="heading"`, such as the day of a timeline.',
      },
      {
        names: ["disclosure"],
        when: "A row that opens a panel under it, such as advanced options or an FAQ.",
      },
      {
        names: ["divider"],
        when: "A line between two blocks that are not in a list.",
      },
      {
        names: ["scroll-mask"],
        when: "A scroll region whose content blurs out at each edge it can still scroll to.",
      },
      {
        names: ["flow-block"],
        when: "Wrap content that sits under a `Disclosure` and is not already a block, so it moves when the panel opens.",
      },
    ],
  },
  {
    slug: "lists",
    title: "Lists and tables",
    entries: [
      {
        names: ["list", "list-row"],
        when: "Rows that each open something, such as transactions or accounts: a name, a detail line, a value and a caret.",
      },
      {
        names: [
          "table",
          "table-head",
          "table-body",
          "table-foot",
          "table-row",
          "table-header-cell",
          "table-cell",
        ],
        when: "A static data table with columns to compare; not a data grid.",
      },
      {
        names: ["table-disclosure", "table-disclosure-trigger"],
        when: "A table row that opens a panel under it; use it in place of `TableBody`, one per row.",
      },
      {
        names: ["meta-line"],
        when: 'Facts on one line with a "·" between them, such as the detail line of a row.',
      },
      {
        names: ["badge"],
        when: "A short status or label, such as Pending or Overdue.",
      },
      {
        names: ["status-dot"],
        when: "A small dot that says something waits, beside a label or on an icon.",
      },
      {
        names: ["avatar"],
        when: "A person or organisation: portrait, logo or monogram.",
      },
    ],
  },
  {
    slug: "text",
    title: "Text",
    entries: [
      {
        names: ["text"],
        when: "All body copy, labels and captions; choose the size with `look` and the colour with `tone`.",
      },
      {
        names: ["heading"],
        when: "A heading: `level` sets the rank, `look` the size.",
      },
      {
        names: ["code-block"],
        when: "A block of code drawn as coloured runs.",
      },
    ],
  },
  {
    slug: "forms",
    title: "Forms",
    entries: [
      {
        names: ["text-field"],
        when: "A one-line text input with its label, help and error.",
      },
      {
        names: ["textarea"],
        when: "A multi-line text input, optionally growing with its content.",
      },
      {
        names: ["select"],
        when: "One choice from a list of five or more, as a native `<select>`.",
      },
      {
        names: ["switch"],
        when: "A setting that is on or off and applies at once.",
      },
      {
        names: ["checkbox"],
        when: "A yes or no in a form that is saved later, or one pick of many.",
      },
      {
        names: ["segmented-control"],
        when: "One of two to four views or kinds, such as Expense and Income.",
      },
      {
        names: ["filter-chips"],
        when: "One filter of a list among any number that all show, such as All, Filed, Archived, Junk, with an optional count each; a row too wide scrolls sideways.",
      },
      {
        names: ["radio-group"],
        when: "One of a few plain answers, each a radio with a label and an optional description, such as when to notify.",
      },
      {
        names: ["option-card-group", "option-card", "option-card-stack"],
        when: "A choice where each answer needs a description, such as a plan; render `OptionCard`s yourself in an `OptionCardStack` for custom content.",
      },
      {
        names: ["slider"],
        when: "A number in a range, picked by dragging.",
      },
    ],
  },
  {
    slug: "actions",
    title: "Actions and navigation",
    entries: [
      {
        names: ["button"],
        when: "Every action and every link that looks like a button; `href` makes it a link.",
      },
      {
        names: ["menu-button", "menu-item", "menu-label"],
        when: "A button that opens a menu of commands, such as More with Rename and Delete.",
      },
      {
        names: ["nav-list", "nav-group", "nav-link"],
        when: "The links between the pages of one place, such as settings sections in a sidebar or the `secondary` of a `TabView`.",
      },
      {
        names: ["anchor"],
        when: "A text link inside a sentence, or standing alone.",
      },
      {
        names: ["breadcrumb"],
        when: "The trail of pages above the current one.",
      },
      {
        names: ["pager"],
        when: "Links to the previous and next page at the end of a page in a sequence.",
      },
      {
        names: ["external-link-indicator"],
        when: "The icon and screen-reader text for a custom link that opens in a new tab.",
      },
    ],
  },
  {
    slug: "feedback",
    title: "Feedback",
    entries: [
      {
        names: ["callout"],
        when: "A message in the page, such as a warning before a destructive step or the result of a check.",
      },
      {
        names: ["toast-provider", "toast"],
        when: "A short message about what an action did, with Undo; call `useToast()` and wrap the app in `ToastProvider` once.",
        note: "`useToast` imports from `@tuja/ui/components/toast-provider` and returns `show({ message, action?, secondAction?, durationMs? })`. `Toast` is the surface alone.",
      },
      {
        names: ["progress"],
        when: "How much of a task of known length is done.",
      },
      {
        names: ["spinner"],
        when: "Work with no known end.",
      },
      {
        names: ["skeleton"],
        when: "A placeholder in the shape of content that is loading.",
      },
    ],
  },
  {
    slug: "overlays",
    title: "Overlays",
    entries: [
      {
        names: ["sheet"],
        when: "A modal for a short task, such as a form to add or edit one thing; a bottom sheet on a phone.",
      },
      {
        names: ["popover"],
        when: "Non-modal content hung off a trigger, such as details or a small form; for commands use `MenuButton`.",
      },
    ],
  },
  {
    slug: "setup",
    title: "App setup and effects",
    entries: [
      {
        names: ["link-provider"],
        when: "Once at the root, so every `Button` with an `href` uses the router's link (`RouterLink` from `@tuja/next-links/router-link` in a Next app).",
      },
      {
        names: ["effect-layer-provider"],
        when: "Once at the root of an app that draws WebGPU effects, such as the liquid of a `Switch`.",
      },
      {
        names: ["portal-target-provider"],
        when: "Once at the root: the box that overlays such as `Sheet` and `Popover` portal into.",
      },
      {
        names: ["blur-plane-provider"],
        when: "Around a shell whose floating controls blur the page under them.",
      },
      {
        names: ["progressive-blur"],
        when: "The page blurred around a floating element, in place of dimming it.",
      },
      {
        names: ["fixed-container-content"],
        when: "Around fixed content that flashes in Chrome during a view transition.",
      },
      {
        names: ["effect-carrier", "effect-container"],
        when: "Say what the effects inside move with, or keep them inside one container.",
      },
      {
        names: [
          "use-ripple",
          "use-liquid",
          "use-dust",
          "use-extractor-fan",
          "use-light-beam",
          "use-black-hole",
        ],
        when: "Effect-layer hooks: attach the returned ref to an element. Read the `effect-layer` skill first.",
      },
    ],
  },
];
