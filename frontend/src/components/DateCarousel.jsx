import React, { useState } from "react";
import dayjs from "dayjs";

const genDates = (start, days) => {
  return Array.from({ length: days }, (_, i) => start.add(i, "day"));
};

const DateCarousel = ({ days = 14, onSelect, value }) => {
  const [startOffset, setStartOffset] = useState(0);

  const today = dayjs().startOf("day");
  const dates = genDates(today.add(startOffset, "day"), days);

  const handlePrev = () => setStartOffset((prev) => Math.max(0, prev - 1));
  const handleNext = () => setStartOffset((prev) => prev + 1);

  return (
    <div className="w-full flex items-center gap-2 select-none py-2">
      <button
        onClick={handlePrev}
        className="rounded-full bg-black text-white w-8 h-8 flex items-center justify-center text-xl font-bold"
        disabled={startOffset === 0}
        style={{
          opacity: startOffset === 0 ? 0.5 : 1,
          cursor: startOffset === 0 ? "not-allowed" : "pointer",
        }}
      >
        &lt;
      </button>
      <div className="flex gap-2 overflow-x-auto">
        {dates.map((d) => {
          const selected = value && dayjs(value).isSame(d, "date");
          return (
            <button
              key={d.format("YYYY-MM-DD")}
              onClick={() => onSelect && onSelect(d.format("YYYY-MM-DD"))}
              className={`flex flex-col items-center px-3 py-2 rounded-xl border min-w-[64px] transition font-medium
                ${
                  selected
                    ? "bg-primary-dull text-white border-primary"
                    : "bg-primary/20 text-white border-primary/30 hover:bg-primary-dull"
                }
              `}
            >
              <span className="text-xs opacity-80">
                {d.format("MM")} {d.format("ddd")}
              </span>
              <span className={`text-xl ${selected ? "font-bold" : ""}`}>
                {d.format("DD")}
              </span>
            </button>
          );
        })}
      </div>
      {/* Button Next */}
      <button
        onClick={handleNext}
        className="rounded-full background-color text-white w-8 h-8 flex items-center justify-center text-xl font-bold"
      >
        &gt;
      </button>
    </div>
  );
};

export default DateCarousel;
