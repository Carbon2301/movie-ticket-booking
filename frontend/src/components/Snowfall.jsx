import React, { useMemo } from "react";

const Snowfall = ({ count = 50 }) => {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = (Math.random() * 5 + 1) * 0.2; // 0.2vw - 1.2vw
        const leftStart = Math.random() * 20 - 10; // -10vw to 10vw
        const leftEnd = Math.random() * 20 - 10; // -10vw to 10vw

        return {
          id: i,
          size,
          left: Math.random() * 100, // 0vw - 100vw
          leftStart,
          leftEnd,
          duration: 5 + Math.random() * 10, // 5s - 15s
          delay: -(Math.random() * 10), // -0s to -10s
          blur: (i + 1) % 6 === 0 ? "blur(1px)" : "none",
        };
      }),
    [count],
  );

  return (
    <div className="snow-container" aria-hidden="true">
      {flakes.map(
        ({ id, size, left, leftStart, leftEnd, duration, delay, blur }) => (
          <span
            key={id}
            className="snowflake"
            style={{
              "--size": `${size}vw`,
              "--left-ini": `${leftStart}vw`,
              "--left-end": `${leftEnd}vw`,
              left: `${left}vw`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              filter: blur,
            }}
          />
        ),
      )}
    </div>
  );
};

export default Snowfall;

