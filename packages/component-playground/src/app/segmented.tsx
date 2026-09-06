export interface SegmentedOption<T> {
  value: T;
  label: string;
}

interface SegmentedProps<T> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onPick: (value: T) => void;
  /** Overrides the default `===` check, for a value that needs a tolerance. */
  isPressed?: (option: T) => boolean;
}

/** A `role="group"` of toggle buttons, one active at a time. */
export function Segmented<T>({
  label,
  options,
  value,
  onPick,
  isPressed = (option) => option === value,
}: SegmentedProps<T>) {
  return (
    <div className="pg-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className="pg-segment"
          aria-pressed={isPressed(option.value)}
          onClick={() => {
            onPick(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
