"use client";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  small?: boolean;
  color?: string;
}

const STARS = 5;

export function Rating({
  value,
  onChange,
  readOnly = false,
  small = false,
  color = "#F5A841",
}: RatingProps) {
  const galaxies = [];
  for (let i = 1; i <= STARS; i++) {
    const full = value >= i;
    const half = !full && value >= i - 0.5;
    const width = full ? "100%" : half ? "50%" : "0%";
    if (readOnly) {
      galaxies.push(
        <span
          key={i}
          className={`star small-${small}`}
          aria-hidden="true"
          style={{ color, cursor: "default" }}
        >
          <span className="star-base">★</span>
          <span className="star-fill" style={{ width }}>
            ★
          </span>
        </span>
      );
    } else {
      galaxies.push(
        <button
          key={i}
          type="button"
          className={`star small-${small}`}
          onClick={() => onChange?.(i)}
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star`}
          style={{ color, cursor: "pointer" }}
        >
          <span className="star-base">★</span>
          <span className="star-fill" style={{ width }}>
            ★
          </span>
        </button>
      );
    }
  }
  return (
    <div
      className={small ? "rating small" : "rating"}
      role="radiogroup"
      aria-label={`Rating: ${value} out of ${STARS} stars`}
    >
      {galaxies}
    </div>
  );
}
