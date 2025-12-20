const CinemaSeatMap = ({
  seatLayoutData,
  selectedSeats,
  setSelectedSeats,
  bookedSeats = [],
  lockedSeats = [],
  onSeatClick,
  maxSelect = 8,
}) => {
  if (!seatLayoutData)
    return (
      <p className="text-gray-400">No seat layout configured for this room.</p>
    );

  const bookedSet = new Set(bookedSeats);
  const lockedSet = new Set(lockedSeats);

  const toggleSeat = (seatCode, isBooked, isLocked) => {
    const isSelected = selectedSeats.includes(seatCode);
    
    // Allow deselect if already selected (even if locked by us)
    // Block if booked or locked by someone else
    if (!isSelected && (isBooked || isLocked)) return;
    
    // Call parent handler if provided
    if (onSeatClick) {
      onSeatClick(seatCode);
      return;
    }
    
    // Fallback to local state management
    setSelectedSeats((prev) =>
      prev.includes(seatCode)
        ? prev.filter((s) => s !== seatCode)
        : prev.length < maxSelect
        ? [...prev, seatCode]
        : prev
    );
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="flex flex-col gap-3">
        {seatLayoutData.rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="flex items-center justify-center gap-6 flex-1">
              {row.blocks.map((block, bIdx) => (
                <div key={`${row.label}-b${bIdx}`} className="flex gap-2">
                  {block.map((seatNum) => {
                    const seatCode = `${row.label}${seatNum}`;

                    const isSelected = selectedSeats.includes(seatCode);
                    const isBooked = bookedSet.has(seatCode);
                    const isLocked = lockedSet.has(seatCode);

                    const baseClass =
                      "h-8 w-8 rounded border cursor-pointer flex items-center justify-center text-xs transition";
                    
                    let btnClass;
                    if (isBooked) {
                      btnClass =
                        "h-8 w-8 rounded border border-gray-400 bg-gray-400 text-gray-600 cursor-not-allowed flex items-center justify-center text-xs";
                    } else if (isLocked) {
                      btnClass =
                        "h-8 w-8 rounded border border-orange-400 bg-orange-400 text-white cursor-not-allowed flex items-center justify-center text-xs animate-pulse";
                    } else {
                      const borderColorClass = row.isVip
                        ? " border-yellow-200"
                        : " border-primary";
                      btnClass =
                        baseClass +
                        borderColorClass +
                        (isSelected
                          ? " bg-primary text-white"
                          : " bg-transparent text-white");
                    }

                    return (
                      <button
                        type="button"
                        key={seatCode}
                        disabled={isBooked || (isLocked && !isSelected)}
                        className={btnClass}
                        onClick={() => toggleSeat(seatCode, isBooked, isLocked)}
                        title={`${seatCode}${row.isVip ? " • VIP" : ""}${
                          isBooked ? " • Booked" : ""
                        }${isLocked && !isSelected ? " • Locked by another user" : ""}`}
                      >
                        {seatCode}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-6 text-xs text-gray-300">
        <div className="flex items-center gap-2">
          <span className="inline-block w-6 h-6 rounded border border-primary" />
          Standard
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-6 h-6 rounded border border-yellow-200" />
          VIP
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-6 h-6 rounded border border-primary bg-primary text-white" />
          Selected
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-6 h-6 rounded border border-orange-400 bg-orange-400 text-white" />
          Locked
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-6 h-6 rounded border border-gray-400 bg-gray-400 text-gray-600" />
          Booked
        </div>
      </div>
    </div>
  );
};

export default CinemaSeatMap;
