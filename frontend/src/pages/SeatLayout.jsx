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

const SeatLayout = () => {
  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookedSeatCodes, setBookedSeatCodes] = useState([]);

  const navigate = useNavigate();

  const location = useLocation();
  const { isLoggedIn } = useAuth();

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

  useEffect(() => {
    if (!selectedScheduleId && schedules.length > 0) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === selectedScheduleId) || null,
    [schedules, selectedScheduleId]
  );

  const availableSlots = useMemo(() => {
    if (!selectedSchedule) return [];
    const cinemaId = selectedSchedule?.room?.cinema?.id;
    const slots = schedules
      .filter((s) => s?.room?.cinema?.id === cinemaId)
      .map((s) => ({
        scheduleId: s.id,
        time: new Date(s.startTime).toISOString().slice(11, 16),
      }))
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
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
            {availableSlots.map((item) => (
              <div
                key={item.scheduleId}
                onClick={() => onSelectSlot(item)}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md
                  cursor-pointer transition ${
                    selectedScheduleId === item.scheduleId
                      ? "bg-primary text-white"
                      : "hover:bg-primary/20"
                  }`}
              >
                <ClockIcon className="w-4 h-4" />
                <p className="text-sm">{item.time}</p>
              </div>
            ))}
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
