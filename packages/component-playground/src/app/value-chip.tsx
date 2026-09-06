import {
  parseStyleValue,
  type ParsedValue,
  type StyleValue,
  type TokenEntry,
  type TokenIndex,
} from "@tuja/component-playground";
import { useMemo, useRef, useState } from "react";
import {
  keywordsFor,
  pickerSourcesFor,
  type PickerSource,
} from "./model/picker-source.ts";
import { isCssKeyword, kindOf } from "./model/properties.ts";
import { Popover } from "./popover.tsx";

export function Swatch({ token }: { token: TokenEntry }) {
  if (token.light === undefined || token.dark === undefined) return null;
  return (
    <span className="pg-swatch" aria-hidden>
      <span style={{ background: token.light }} />
      <span style={{ background: token.dark }} />
    </span>
  );
}

type MarkKind = "expression" | "keyword" | "off-system";

/** How a value the design system does not name is labelled, if at all. */
function markFor(parsed: ParsedValue, property: string): MarkKind | null {
  if (parsed.kind === "token") return null;
  if (parsed.kind === "expression") return "expression";
  if (isCssKeyword(parsed.text)) return "keyword";
  const kind = kindOf(property);
  return kind === "enum" || kind === "free" ? null : "off-system";
}

function Mark({ kind }: { kind: MarkKind | null }) {
  if (kind === null) return null;
  return (
    <span className={kind === "keyword" ? "pg-keyword" : "pg-off-system"}>
      {kind}
    </span>
  );
}

interface ValueChipProps {
  property: string;
  value: StyleValue | undefined;
  index: TokenIndex;
}

/** The value as the config writes it, with what it resolves to beside it. */
export function ValueChip({ property, value, index }: ValueChipProps) {
  if (value === undefined) {
    return <span className="pg-value pg-value--unset">unset</span>;
  }
  const parsed = parseStyleValue(value, index);
  if (parsed.kind === "token") {
    const token = index.token(parsed.token);
    return (
      <span className="pg-value">
        {token ? <Swatch token={token} /> : null}
        <span className="pg-token-name">{parsed.token}</span>
        {token?.hint ? <span className="pg-hint">{token.hint}</span> : null}
      </span>
    );
  }
  return (
    <span className="pg-value">
      <span className="pg-token-name">{String(value)}</span>
      <Mark kind={markFor(parsed, property)} />
    </span>
  );
}

interface PickerBodyProps {
  property: string;
  current: StyleValue | undefined;
  index: TokenIndex;
  /** Overrides the groups the property type would offer. */
  sources?: PickerSource[];
  onPick: (value: string) => void;
}

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Search, a group filter where more than one group applies, and the tokens as
 * rows. A value the design system does not name sits at the top, read only,
 * because it can only be replaced by a token.
 */
export function PickerBody({
  property,
  current,
  index,
  sources: given,
  onPick,
}: PickerBodyProps) {
  const sources = useMemo(
    () => given ?? pickerSourcesFor(property, index.catalogue),
    [given, property, index],
  );
  const keywords = keywordsFor(property);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const active =
    sources.find((source) => source.id === sourceId) ?? sources.at(0);
  const tokens: TokenEntry[] = (active?.tokens ?? []).filter(
    (token) => matches(token.name, query) || matches(token.hint, query),
  );
  const shownKeywords = keywords.filter((keyword) => matches(keyword, query));

  const parsed =
    current === undefined ? undefined : parseStyleValue(current, index);
  const showsLiteral =
    parsed !== undefined && parsed.kind !== "token" && keywords.length === 0;

  return (
    <div className="pg-picker">
      {showsLiteral ? (
        <p className="pg-picker-literal">
          <span className="pg-token-name">{String(current)}</span>
          <Mark kind={markFor(parsed, property)} />
        </p>
      ) : null}
      <input
        className="pg-search"
        type="search"
        autoFocus
        placeholder="Search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      {sources.length > 1 ? (
        <div className="pg-filter">
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              className="pg-filter-chip"
              aria-pressed={source.id === active?.id}
              onClick={() => {
                setSourceId(source.id);
              }}
            >
              {source.label}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="pg-options">
        {shownKeywords.map((keyword) => (
          <li key={keyword}>
            <button
              type="button"
              className="pg-option"
              aria-current={String(current) === keyword}
              onClick={() => {
                onPick(keyword);
              }}
            >
              <span className="pg-token-name">{keyword}</span>
            </button>
          </li>
        ))}
        {tokens.map((token) => (
          <li key={token.name}>
            <button
              type="button"
              className="pg-option"
              aria-current={String(current) === token.name}
              onClick={() => {
                onPick(token.name);
              }}
            >
              <Swatch token={token} />
              <span className="pg-token-name">{token.name}</span>
              <span className="pg-hint">{token.hint}</span>
            </button>
          </li>
        ))}
        {tokens.length + shownKeywords.length === 0 ? (
          <li className="pg-empty">Nothing matches “{query}”.</li>
        ) : null}
      </ul>
    </div>
  );
}

interface TokenFieldProps {
  /** Names the picker, and picks its token groups when `sources` is absent. */
  property: string;
  value: StyleValue | undefined;
  index: TokenIndex;
  isPhone: boolean;
  sources?: PickerSource[];
  title?: string;
  onPick: (value: string) => void;
}

/** The value chip that opens the picker. */
export function TokenField({
  property,
  value,
  index,
  isPhone,
  sources,
  title,
  onPick,
}: TokenFieldProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        className="pg-value-button"
        onClick={() => {
          setAnchor(buttonRef.current?.getBoundingClientRect() ?? null);
        }}
      >
        <ValueChip property={property} value={value} index={index} />
      </button>
      {anchor ? (
        <Popover
          anchor={anchor}
          title={title ?? property}
          isPhone={isPhone}
          onClose={() => {
            setAnchor(null);
          }}
        >
          <PickerBody
            property={property}
            current={value}
            index={index}
            sources={sources}
            onPick={(picked) => {
              onPick(picked);
              setAnchor(null);
            }}
          />
        </Popover>
      ) : null}
    </>
  );
}
