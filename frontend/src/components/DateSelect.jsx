import React, { useState, useMemo, forwardRef } from "react";
import BlurCircle from "./BlurCircle";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const DateSelect = forwardRef(({ dateTime = [], id }, ref) => {
  const grouped = useMemo(() => {
    const now = new Date();
    const obj = {};
    dateTime
      .filter((sch) => new Date(sch.startTime) > now)
      .forEach((sch) => {
        const dateKey = new Date(sch.startTime).toISOString().slice(0, 10);
        const cinemaName =
          sch.room?.cinema?.name || `Cinema ${sch.room?.cinemaId || ""}`;
        const roomName = sch.room?.name || `Room ${sch.roomId}`;
        if (!obj[dateKey]) obj[dateKey] = {};
        if (!obj[dateKey][cinemaName]) obj[dateKey][cinemaName] = {};
        if (!obj[dateKey][cinemaName][roomName])
          obj[dateKey][cinemaName][roomName] = [];
        obj[dateKey][cinemaName][roomName].push({
          time: new Date(sch.startTime).toISOString().slice(11, 16),
          scheduleId: sch.id,
          cinemaId: sch.room?.cinema?.id,
          roomId: sch.roomId,
        });
      });
    return obj;
  }, [dateTime]);

  const dateList = Object.keys(grouped);
  const [selectedDate, setSelectedDate] = useState(dateList[0] || null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const navigate = useNavigate();

  React.useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  React.useEffect(() => {
    if (dateList.length > 0) setSelectedDate(dateList[0]);
    else setSelectedDate(null);
  }, [dateList.join(",")]);

  const onBookingHandle = () => {
    if (!selectedDate || !selectedSlot) {
      return toast("Please select both date and showtime!");
    }
    navigate(
      `/movies/${id}/date=${selectedDate}&schedule=${selectedSlot.scheduleId}`
    );
    scrollTo(0, 0);
  };

  return (
    <div ref={ref} id="dateSelect" className="pt-30">
      <div
        className="flex flex-col md:flex-row items-center justify-between gap-10
        relative p-8 bg-primary/10 border border-primary/20 rounded-lg"
      >
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0px" />
        <div>
          <p className="text-lg font-semibold">Choose Date & Showtime</p>
          <div className="flex items-center gap-6 text-sm mt-5">
            <ChevronLeftIcon width={28} />
            <div className="grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">
              {dateList.length > 0 ? (
                dateList.map((date) => (
                  <button
                    key={date}
                    className={`flex flex-col items-center justify-center h-14 w-14
                      aspect-square rounded cursor-pointer ${
                        selectedDate === date
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                  >
                    <span>{new Date(date).getDate()}</span>
                    <span>
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </span>
                  </button>
                ))
              ) : (
                <span className="text-gray-400 italic col-span-3">
                  No showtimes available
                </span>
              )}
            </div>
            <ChevronRightIcon width={28} />
          </div>

          {/* Hiển thị các rạp và phòng, giờ chiếu theo ngày chọn */}
          {selectedDate && grouped[selectedDate] && (
            <div className="mt-4 flex flex-col gap-4">
              {Object.entries(grouped[selectedDate]).map(([cinema, rooms]) => (
                <div key={cinema} className="mb-2">
                  <div className="font-bold text-primary text-base mb-1">
                    {cinema}
                  </div>
                  {Object.entries(rooms).map(([room, slots]) => (
                    <div key={room} className="ml-4 mb-1">
                      {/* <div className=" text-gray-200 mb-0.5">{room}</div> */}
                      <div className="flex gap-3 flex-wrap ml-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.scheduleId}
                            className={`px-4 py-2 rounded-md text-xs flex flex-col items-center
                              ${
                                selectedSlot?.scheduleId === slot.scheduleId
                                  ? "bg-primary text-white"
                                  : "bg-gray-200 text-gray-800"
                              }`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <span>{slot.time}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onBookingHandle}
            className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
});

export default DateSelect;
