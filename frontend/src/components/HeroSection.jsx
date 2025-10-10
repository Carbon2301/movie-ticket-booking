import React, { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  CalendarIcon,
  ClockIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import Loading from "./Loading";

const HeroSection = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchLatestMovies = async () => {
      try {
        const res = await api.get("/movies/top-favorites");
        let allMovies = Array.isArray(res.data)
          ? res.data
          : res.data.movies || [];

        const latestMovies = allMovies
          .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
          .slice(0, 5);

        setMovies(latestMovies);
      } catch (err) {
        console.error(err);
        setError("Không thể tải danh sách phim.");
      } finally {
        setLoading(false);
      }
    };

    fetchLatestMovies();
  }, []);

  useEffect(() => {
    if (movies.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 6000);

    return () => clearInterval(intervalRef.current);
  }, [movies]);

  const handleNext = () => {
    clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const handlePrev = () => {
    clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  const movie = movies[currentIndex];

  if (loading) {
    return <Loading />;
  }

  if (error || !movie) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 text-xl">
        {error || "Không có phim."}
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center px-6 md:px-16 lg:px-36 flex flex-col justify-end gap-4 z-10 pb-12"
          style={{
            backgroundImage: `url(${movie.posterUrl})`,
          }}
        >
          <h1 className="text-5xl md:text-[70px] md:leading-[1.2] font-semibold max-w-4xl text-white drop-shadow-lg">
            {movie.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-200">
            <span>{movie.genre}</span>
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4.5 h-4.5" />
              {movie.releaseDate
                ? new Date(movie.releaseDate).getFullYear()
                : ""}
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4.5 h-4.5" />
              {movie.durationMinutes
                ? `${Math.floor(movie.durationMinutes / 60)}h ${
                    movie.durationMinutes % 60
                  }m`
                : ""}
            </div>
          </div>
          <p className="max-w-md text-gray-200">{movie.description}</p>
          <button
            onClick={() => navigate("/movies")}
            className="w-fit flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
          >
            Explore Movies
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/70 z-20"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/70 z-20"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[5]" />
      <div className="absolute inset-0 bg-black/40 z-0" />
    </div>
  );
};

export default HeroSection;
