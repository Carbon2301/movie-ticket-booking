import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import BlurCircle from "../components/BlurCircle";
import DateCarousel from "../components/DateCarousel";
import timeFormat from "../lib/timeFormat";
import { ArrowLeft } from "lucide-react";
import Loading from "../components/Loading";

const CinemaDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cinema, setCinema] = useState(null);
  // Lấy ngày hiện tại theo GMT+7 (cộng 7 giờ rồi lấy YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const adjusted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const year = adjusted.getFullYear();
    const month = String(adjusted.getMonth() + 1).padStart(2, "0");
    const day = String(adjusted.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCinema = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/cinemas/${id}`);
        setCinema(res.data);
      } catch (err) {
        setError("Failed to load cinema details");
      } finally {
        setLoading(false);
      }
    };
    fetchCinema();
  }, [id]);

  let moviesMap = {};
  if (cinema && cinema.rooms) {
    // Lấy "bây giờ" theo múi giờ Asia/Ho_Chi_Minh để so sánh
    const nowInVN = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
    );
    const nowTime = nowInVN.getTime();

    for (const room of cinema.rooms) {
      if (!room.schedules) continue;

      for (const schedule of room.schedules) {
        if (!schedule.startTime) continue;

        // Chuyển startTime sang thời gian theo Asia/Ho_Chi_Minh
        const startInVN = new Date(
          new Date(schedule.startTime).toLocaleString("en-US", {
            timeZone: "Asia/Ho_Chi_Minh",
          })
        );
        const startMs = startInVN.getTime();

        // Bỏ qua lịch chiếu đã qua (theo giờ VN)
        if (startMs <= nowTime) continue;

        // Lấy ngày (YYYY-MM-DD) theo giờ VN
        const year = startInVN.getFullYear();
        const month = String(startInVN.getMonth() + 1).padStart(2, "0");
        const day = String(startInVN.getDate()).padStart(2, "0");
        const scheduleDay = `${year}-${month}-${day}`;

        if (scheduleDay !== selectedDate) continue;

        const movie = schedule.movie;
        if (!moviesMap[movie.id]) {
          moviesMap[movie.id] = {
            ...movie,
            showtimes: [],
            posterUrl: movie.posterUrl,
          };
        }

        moviesMap[movie.id].showtimes.push({
          // Hiển thị giờ theo VN (Asia/Ho_Chi_Minh)
          time: new Date(schedule.startTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh",
          }),
          room: room.name,
          scheduleId: schedule.id,
          startTime: schedule.startTime, // giữ lại thời gian gốc để build URL
        });
      }
    }
  }
  const moviesToday = Object.values(moviesMap);

  const handleBookTicket = (movieId, showtime) => {
    // Dùng ngày gốc (YYYY-MM-DD) từ startTime cho query param, giống MovieDetails/DateSelect
    const requestDate = showtime.startTime
      ? showtime.startTime.slice(0, 10)
      : selectedDate;

    navigate(
      `/movies/${movieId}/date=${requestDate}&schedule=${showtime.scheduleId}`
    );
    window.scrollTo(0, 0);
  };

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-10 md:pt-20 min-h-[80vh]">
      <BlurCircle top="50px" left="0px" />
      <BlurCircle bottom="0px" right="100px" />

      <button
        className="mb-6 flex items-center gap-2 text-white font-medium hover:underline"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="flex items-center justify-center h-[60vh]">
          <span className="text-lg text-red-500">{error}</span>
        </div>
      ) : (
        <>
          <div className="mb-8 pb-4 border-b border-gray-200 flex flex-col gap-2">
            <h1 className="text-3xl font-bold">{cinema.name}</h1>
            <p className="text-gray-200">{cinema.location}</p>
          </div>

          <DateCarousel value={selectedDate} onSelect={setSelectedDate} />

          <div className="mt-8 flex flex-col gap-8">
            {moviesToday.length === 0 ? (
              <div className="text-center text-lg text-muted-foreground">
                No showtimes available for this day.
              </div>
            ) : (
              moviesToday.map((movie) => (
                <div
                  key={movie.id}
                  className="flex flex-col md:flex-row items-center gap-6 px-6 py-5 bg-primary/8 rounded-xl shadow"
                >
                  <img
                    src={
                      movie.posterUrl || "https://via.placeholder.com/100x140"
                    }
                    alt={movie.title}
                    className="w-32 h-44 object-cover rounded-lg shadow"
                  />
                  <div className="flex-1 w-full">
                    <h2 className="text-2xl font-semibold">{movie.title}</h2>
                    <div className="mt-2 text-gray-200">
                      <span>{movie.genre}</span>
                      {" • "}
                      <span>{timeFormat(movie.durationMinutes)}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                      {movie.showtimes.map((st) => (
                        <div
                          key={st.scheduleId}
                          className="inline-block px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm shadow cursor-pointer hover:bg-primary/80"
                          onClick={() => handleBookTicket(movie.id, st)}
                        >
                          {st.time}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CinemaDetails;
