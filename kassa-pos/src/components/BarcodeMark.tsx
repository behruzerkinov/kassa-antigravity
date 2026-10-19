import React from 'react';

const BARS = [2, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1];

/** A quiet brand mark: the thing every product in the shop already carries. */
export function BarcodeMark({
  className = '',
  color = 'currentColor',
}: {
  className?: string;
  color?: string;
}) {
  const width = BARS.reduce((sum, w, i) => sum + w + (i % 2 === 0 ? 1.5 : 1), 0);
  let x = 0;

  return (
    <svg
      viewBox={`0 0 ${width} 14`}
      className={className}
      role="img"
      aria-label="Kassa"
      preserveAspectRatio="none"
    >
      {BARS.map((bar, index) => {
        const barWidth = bar;
        const rect = (
          <rect
            key={index}
            x={x}
            y={0}
            width={barWidth}
            height={14}
            fill={color}
            opacity={index % 5 === 0 ? 0.55 : 1}
          />
        );
        x += barWidth + (index % 2 === 0 ? 1.5 : 1);
        return rect;
      })}
    </svg>
  );
}
