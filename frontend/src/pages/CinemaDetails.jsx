import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import dayjs from "dayjs";
import BlurCircle from "../components/BlurCircle";
import DateCarousel from "../components/DateCarousel";
import timeFormat from "../lib/timeFormat";
import { ArrowLeft } from "lucide-react"; 
import Loading from "../components/Loading";

const CinemaDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cinema, setCinema] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );
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
    for (const room of cinema.rooms) {
      if (room.schedules) {
        for (const schedule of room.schedules) {
          const scheduleDay = dayjs(schedule.startTime).format("YYYY-MM-DD");
          if (scheduleDay === selectedDate) {
            const movie = schedule.movie;
            if (!moviesMap[movie.id]) {
              moviesMap[movie.id] = {
                ...movie,
                showtimes: [],
                posterUrl: movie.posterUrl,
              };
            }
            moviesMap[movie.id].showtimes.push({
              time: dayjs(schedule.startTime).format("HH:mm"),
              room: room.name,
              scheduleId: schedule.id,
            });
          }
        }
      }
    }
  }
  const moviesToday = Object.values(moviesMap);

  const handleBookTicket = (movieId, selectedDate, scheduleId) => {
    navigate(`/movies/${movieId}/date=${selectedDate}&schedule=${scheduleId}`);
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
                          onClick={() =>
                            handleBookTicket(
                              movie.id,
                              selectedDate,
                              st.scheduleId
                            )
                          }
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
