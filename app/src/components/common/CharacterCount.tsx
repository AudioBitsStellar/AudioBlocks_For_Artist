/** Share of the limit at which the counter starts warning the user. */
export const CHARACTER_COUNT_WARN_RATIO = 0.9;

export interface CharacterCountProps {
  /** Current length of the field's value. */
  length: number;
  /** The field's `maxLength`. */
  max: number;
  /** Optional id so the owning input can reference the count via aria-describedby. */
  id?: string;
}

/**
 * Shows `length/max` beside a text field. Turns yellow at 90% of the limit and
 * red once the limit is reached. The count is polite-live so screen readers
 * hear it as the user nears the limit.
 */
export default function CharacterCount({ length, max, id }: CharacterCountProps) {
  const tone =
    length >= max
      ? "text-red-500"
      : length >= max * CHARACTER_COUNT_WARN_RATIO
        ? "text-yellow-500"
        : "text-gray-400";

  return (
    <span id={id} className={`text-xs ${tone}`} aria-live="polite">
      {length}/{max}
    </span>
  );
}
