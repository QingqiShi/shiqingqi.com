"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import * as stylex from "@stylexjs/stylex";
import { Chip } from "@tuja/ui/components/chip";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useId, useState, type Ref } from "react";
import { t } from "#src/i18n.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { CategoryRow } from "../sync/row-schemas.ts";
import { FieldLabel } from "./field-label.tsx";

interface CategoryPickerProps {
  /** Live Categories of the Transaction's kind, in tree order. */
  categories: readonly CategoryRow[];
  emojiById: ReadonlyMap<string, string>;
  /** The chips shown first, best first. */
  topIds: readonly string[];
  value: string | null;
  onChange: (categoryId: string) => void;
  fromLastTime: boolean;
  error?: string;
  firstChipRef?: Ref<HTMLButtonElement>;
}

function CategoryChip({
  category,
  emoji,
  isActive,
  onPick,
  chipRef,
}: {
  category: CategoryRow;
  emoji: string;
  isActive: boolean;
  onPick: () => void;
  chipRef?: Ref<HTMLButtonElement>;
}) {
  const categoryName = useCategoryDisplayName();
  return (
    <Chip
      ref={chipRef}
      size="sm"
      isActive={isActive}
      icon={emoji === "" ? undefined : <span>{emoji}</span>}
      onClick={onPick}
    >
      {categoryName(category)}
    </Chip>
  );
}

/**
 * The Category as chips: the most likely ones first, and "More" for the
 * whole tree grouped by parent.
 */
export function CategoryPicker({
  categories,
  emojiById,
  topIds,
  value,
  onChange,
  fromLastTime,
  error,
  firstChipRef,
}: CategoryPickerProps) {
  const labelId = useId();
  const errorId = useId();
  const [showAll, setShowAll] = useState(false);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const top = topIds.flatMap((id) => {
    const category = byId.get(id);
    return category ? [category] : [];
  });
  const selected = value === null ? undefined : byId.get(value);
  if (selected && !top.includes(selected)) top.push(selected);

  const parents = categories.filter(
    (category) => category.parentId === null || !byId.has(category.parentId),
  );
  const childrenOf = (parentId: string) =>
    categories.filter((category) => category.parentId === parentId);

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      css={stack.tight}
    >
      <FieldLabel id={labelId} fromLastTime={fromLastTime}>
        {t({ en: "Category", zh: "分类" })}
      </FieldLabel>
      <div css={cluster.tight}>
        {top.map((category, index) => (
          <CategoryChip
            key={category.id}
            category={category}
            emoji={emojiById.get(category.id) ?? ""}
            isActive={category.id === value}
            onPick={() => {
              onChange(category.id);
            }}
            chipRef={index === 0 ? firstChipRef : undefined}
          />
        ))}
        <Chip
          size="sm"
          aria-expanded={showAll}
          trailing={
            <CaretDownIcon
              weight="bold"
              aria-hidden
              {...stylex.props(showAll && styles.flipped)}
            />
          }
          onClick={() => {
            setShowAll((shown) => !shown);
          }}
        >
          {t({ en: "More", zh: "更多" })}
        </Chip>
      </div>
      {showAll ? (
        <div css={[stack.item, styles.all]}>
          {parents.map((parent) => (
            <div key={parent.id} css={stack.tight}>
              <div css={cluster.tight}>
                <CategoryChip
                  category={parent}
                  emoji={emojiById.get(parent.id) ?? ""}
                  isActive={parent.id === value}
                  onPick={() => {
                    onChange(parent.id);
                    setShowAll(false);
                  }}
                />
              </div>
              {childrenOf(parent.id).length > 0 ? (
                <div css={[cluster.tight, styles.children]}>
                  {childrenOf(parent.id).map((child) => (
                    <CategoryChip
                      key={child.id}
                      category={child}
                      emoji={emojiById.get(child.id) ?? ""}
                      isActive={child.id === value}
                      onPick={() => {
                        onChange(child.id);
                        setShowAll(false);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" css={[typeRole.caption, styles.error]}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  flipped: {
    transform: "rotate(180deg)",
  },
  all: {
    paddingBlockStart: rhythm.tight,
  },
  children: {
    paddingInlineStart: rhythm.item,
  },
  error: {
    color: color.fgDanger,
  },
});
