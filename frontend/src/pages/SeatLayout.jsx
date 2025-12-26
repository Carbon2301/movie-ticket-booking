import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ClockIcon, ArrowLeft, ArrowRightIcon } from "lucide-react";
import { scheduleAPI, ticketsAPI } from "../lib/api";
import BlurCircle from "../components/BlurCircle";
import { assets } from "../assets/assets";
import CinemaSeatMap from "./CinemaSeatMap";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "react-router-dom";
import socketService from "../lib/socketService";

const SeatLayout = () => {
  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookedSeatCodes, setBookedSeatCodes] = useState([]);
  const [lockedSeatCodes, setLockedSeatCodes] = useState([]);

  const navigate = useNavigate();

  const location = useLocation();
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    if (location.state?.selectedSeats) {
      setSelectedSeats(location.state.selectedSeats);
    }
  }, [location.state]);

  const handleProceed = async () => {
    if (!isLoggedIn) {
      toast.error("Bạn cần đăng nhập để đặt vé!");
      navigate("/login", {
        state: { from: location.pathname + location.search, selectedSeats },
        replace: true,
      });
      return;
    }
    if (!selectedSeats.length || !selectedScheduleId) {
      toast.error("Bạn chưa chọn ghế hoặc lịch chiếu!");
      return;
    }
    try {
      const res = await ticketsAPI.bookTickets({
        scheduleId: selectedScheduleId,
        seatCodes: selectedSeats,
      });

      const movie = selectedSchedule?.movie;
      const room = selectedSchedule?.room;
      const showTime = selectedSchedule?.startTime;
      const { ticketIds, seatCodes, scheduleId, totalPrice } = res.data;

      navigate("/payment", {
        state: {
          scheduleId,
          seatCodes,
          totalPrice,
          ticketIds,
          movie,
          room,
          showTime,
        },
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Đặt vé thất bại, ghế đã bị đặt hoặc có lỗi xảy ra!"
      );
    }
  };

  useEffect(() => {
    if (!date) return;
    const qs = new URLSearchParams(date);
    const d = qs.get("date");
    const sch = Number(qs.get("schedule"));
    setSelectedDate(d);
    setSelectedScheduleId(Number.isFinite(sch) ? sch : null);
  }, [date]);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!id || !selectedDate) return;
      try {
        setLoading(true);
        setError("");
        const res = await scheduleAPI.getByMovieId(id, selectedDate);
        setSchedules(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load schedules"
        );
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [id, selectedDate]);

  useEffect(() => {
    const fetchBooked = async () => {
      if (!selectedScheduleId) return;
      try {
        const res = await ticketsAPI.getAvailableSeats(selectedScheduleId);
        const codes = res?.data?.bookedSeatCodes || [];
        setBookedSeatCodes(Array.isArray(codes) ? codes : []);
      } catch (err) {
        setBookedSeatCodes([]);
      }
    };
    fetchBooked();
  }, [selectedScheduleId]);

  // WebSocket integration
  useEffect(() => {
    if (!selectedScheduleId) return;

    // Connect to WebSocket
    socketService.connect();

    // Join the schedule room
    socketService.joinSchedule(selectedScheduleId, (data) => {
      console.log("Initial schedule state:", data);
      setLockedSeatCodes(data.lockedSeats || []);
      // Update booked seats from WebSocket if needed
      if (data.bookedSeats && data.bookedSeats.length > 0) {
        setBookedSeatCodes(data.bookedSeats);
      }
    });

    // Listen for seat locked by other users
    socketService.onSeatLocked((data) => {
      if (data.scheduleId === selectedScheduleId) {
        // Only add to locked seats if it's not the current user
        if (data.userId !== user?.id) {
          setLockedSeatCodes((prev) => {
            if (!prev.includes(data.seatCode)) {
              return [...prev, data.seatCode];
            }
            return prev;
          });
        }
      }
    });

    // Listen for seat unlocked
    socketService.onSeatUnlocked((data) => {
      if (data.scheduleId === selectedScheduleId) {
        setLockedSeatCodes((prev) =>
          prev.filter((seat) => seat !== data.seatCode)
        );
      }
    });

    // Listen for seat booked (confirmed)
    socketService.onSeatBooked((data) => {
      if (data.scheduleId === selectedScheduleId) {
        setBookedSeatCodes((prev) => {
          if (!prev.includes(data.seatCode)) {
            return [...prev, data.seatCode];
          }
          return prev;
        });
        setLockedSeatCodes((prev) =>
          prev.filter((seat) => seat !== data.seatCode)
        );
        setSelectedSeats((prev) =>
          prev.filter((seat) => seat !== data.seatCode)
        );
      }
    });

    // Listen for seat cancelled (ticket cancelled)
    socketService.onSeatCancelled((data) => {
      if (data.scheduleId === selectedScheduleId) {
        setBookedSeatCodes((prev) =>
          prev.filter((seat) => seat !== data.seatCode)
        );
        toast.success(`Ghế ${data.seatCode} vừa được hủy bởi người dùng khác, có thể đặt lại!`);
      }
    });

    // Listen for lock failed
    socketService.onLockFailed((data) => {
      if (data.scheduleId === selectedScheduleId) {
        toast.error(`Không thể chọn ghế ${data.seatCode}: ${data.reason}`);
        setSelectedSeats((prev) =>
          prev.filter((seat) => seat !== data.seatCode)
        );
      }
    });

    // Cleanup on unmount or schedule change
    return () => {
      socketService.leaveSchedule(selectedScheduleId);
      socketService.removeAllListeners();
    };
  }, [selectedScheduleId]);

  useEffect(() => {
    if (schedules.length === 0) return;
    
    const now = new Date();
    // Use same logic as DateSelect: add 7 hours (timezone offset)
    const nowTime = now.getTime() + 7 * 60 * 60 * 1000;
    
    // If no schedule selected, find first available (future) schedule
    if (!selectedScheduleId) {
      const availableSchedule = schedules.find((s) => {
        if (!s.startTime) return false;
        const startTime = new Date(s.startTime).getTime();
        return startTime > nowTime;
      });
      if (availableSchedule) {
        setSelectedScheduleId(availableSchedule.id);
      } else if (schedules.length > 0) {
        // Fallback to first schedule if no future schedule found
        setSelectedScheduleId(schedules[0].id);
      }
      return;
    }
    
    // If current selected schedule is in the past, switch to next available
    const currentSchedule = schedules.find((s) => s.id === selectedScheduleId);
    if (currentSchedule && currentSchedule.startTime) {
      const currentStartTime = new Date(currentSchedule.startTime).getTime();
      if (currentStartTime <= nowTime) {
        const availableSchedule = schedules.find((s) => {
          if (!s.startTime) return false;
          const startTime = new Date(s.startTime).getTime();
          return startTime > nowTime;
        });
        if (availableSchedule) {
          setSelectedScheduleId(availableSchedule.id);
        }
      }
    }
  }, [schedules, selectedScheduleId]);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === selectedScheduleId) || null,
    [schedules, selectedScheduleId]
  );

  const availableSlots = useMemo(() => {
    if (!selectedSchedule) return [];
    const cinemaId = selectedSchedule?.room?.cinema?.id;
    const now = new Date();
    // Use same logic as DateSelect: add 7 hours (timezone offset)
    const nowTime = now.getTime() + 7 * 60 * 60 * 1000;
    const filteredSchedules = schedules
      .filter((s) => {
        // Filter by cinema ID and exclude past times
        if (s?.room?.cinema?.id !== cinemaId) return false;
        if (!s.startTime) return false;
        const startTime = new Date(s.startTime).getTime();
        return startTime > nowTime;
      })
      .sort((a, b) => {
        // Sort by actual startTime to handle same-day times correctly
        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();
        return timeA - timeB;
      });
    
    const slots = filteredSchedules.map((s) => ({
      scheduleId: s.id,
      time: new Date(s.startTime).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh' // GMT+7
      }),
      startTime: s.startTime, // Keep for double-checking in render
    }));
    
    return slots;
  }, [schedules, selectedSchedule]);

  const onSelectSlot = (slot) => {
    setSelectedScheduleId(slot.scheduleId);
    if (selectedDate) {
      navigate(
        `/movies/${id}/date=${selectedDate}&schedule=${slot.scheduleId}`
      );
      scrollTo(0, 0);
    }
  };

  const handleSeatClick = (seatCode) => {
    if (!user?.id) {
      toast.error("Vui lòng đăng nhập để chọn ghế!");
      return;
    }

    const isCurrentlySelected = selectedSeats.includes(seatCode);

    if (isCurrentlySelected) {
      // Deselect seat - unlock it
      setSelectedSeats((prev) => prev.filter((s) => s !== seatCode));
      socketService.unlockSeat(selectedScheduleId, seatCode, user.id);
    } else {
      // Select seat - lock it
      if (selectedSeats.length >= 8) {
        toast.error("Bạn chỉ có thể chọn tối đa 8 ghế!");
        return;
      }
      setSelectedSeats((prev) => [...prev, seatCode]);
      socketService.lockSeat(selectedScheduleId, seatCode, user.id);
    }
  };

  const toRowLabel = (index) => {
    const A = "A".charCodeAt(0);
    let i = index;
    let label = "";
    while (i >= 0) {
      label = String.fromCharCode(A + (i % 26)) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  const computeBlocks = (seatsPerRow) => {
    if (seatsPerRow >= 12 && seatsPerRow <= 16) {
      const middle = seatsPerRow - 4;
      return [2, middle, 2];
    }
    if (seatsPerRow >= 17) {
      const middle = seatsPerRow - 6;
      return [3, middle, 3];
    }
    return [seatsPerRow];
  };

  const seatLayoutData = useMemo(() => {
    const layout = selectedSchedule?.room?.seatLayout || null;
    if (!layout) return null;

    const isRowsArray = Array.isArray(layout.rows);
    let rowLabels = [];
    let seatsPerRow = 0;
    if (!isRowsArray) {
      const totalRows = Number(layout.rows) || 0;
      seatsPerRow = Number(layout.seatsPerRow) || 0;
      rowLabels = Array.from({ length: totalRows }, (_, i) => toRowLabel(i));
    } else {
      rowLabels = layout.rows.map((r, i) =>
        typeof r === "string" ? r.toUpperCase() : toRowLabel(i)
      );
      seatsPerRow = Number(layout.seatsPerRow || 0);
    }

    const parseVipRows = (vipRows, rowLabels) => {
      const vipSet = new Set();
      if (!vipRows) return vipSet;
      if (Array.isArray(vipRows)) {
        vipRows.forEach((v) => {
          if (typeof v === "number" && rowLabels[v]) {
            vipSet.add(rowLabels[v]);
          } else if (typeof v === "string") {
            vipSet.add(v.toUpperCase());
          }
        });
      }
      return vipSet;
    };

    const vipSet = parseVipRows(layout.vipRows, rowLabels);

    const rows = rowLabels.map((label, rIdx) => {
      const blocks = computeBlocks(seatsPerRow);
      let current = 1;
      const blockSeats = blocks.map((size) => {
        const nums = Array.from({ length: size }, () => current++);
        return nums;
      });
      return {
        label,
        isVip: vipSet.has(label),
        blocks: blockSeats,
      };
    });

    return { rows };
  }, [selectedSchedule]);

  const bookedSeats = bookedSeatCodes;

  if (loading) return <Loading />;
  if (error)
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">{error}</p>
      </div>
    );

  return selectedSchedule ? (
    <div className="flex flex-col md:flex-row gap-8 px-6 md:px-16 lg:px-40 py-12 md:pt-24">
      <div className="w-full md:w-60 max-md:mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="bg-primary/10 border border-primary/20 rounded-lg py-8 h-max">
          <p className="text-lg font-semibold px-6">Available Timings</p>
          <div className="mt-5 space-y-1">
            {availableSlots
              .filter((item) => {
                // Double-check: filter out past times in render (using DateSelect logic)
                if (!item.startTime) return false;
                const now = new Date();
                const nowTime = now.getTime() + 7 * 60 * 60 * 1000;
                const startTime = new Date(item.startTime).getTime();
                return startTime > nowTime;
              })
              .map((item) => {
                const isSelected = selectedScheduleId === item.scheduleId;
                
                return (
                  <div
                    key={item.scheduleId}
                    onClick={() => onSelectSlot(item)}
                    className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md transition cursor-pointer hover:bg-primary/20 ${
                      isSelected
                        ? "bg-primary text-white"
                        : ""
                    }`}
                  >
                    <ClockIcon className="w-4 h-4" />
                    <p className="text-sm">{item.time}</p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      <div className="relative flex-1 flex flex-col items-center">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        <h1 className="text-2xl font-semibold mb-4 mt-4 md:mt-0">
          Select your seat
        </h1>
        <img src={assets.screenImage} alt="screen" className="mb-2" />
        <p className="text-gray-100 text-sm mb-6">SCREEN SIDE</p>
        <CinemaSeatMap
          seatLayoutData={seatLayoutData}
          selectedSeats={selectedSeats}
          setSelectedSeats={setSelectedSeats}
          bookedSeats={bookedSeats}
          lockedSeats={lockedSeatCodes}
          onSeatClick={handleSeatClick}
          maxSelect={8}
        />
        <button
          onClick={handleProceed}
          className="flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary
          hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
