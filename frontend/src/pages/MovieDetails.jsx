import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";
import {
  StarIcon,
  ArrowLeft,
  Heart,
  PlayCircle as PlayIcon,
} from "lucide-react";
import timeFormat from "../lib/timeFormat";
import { movieAPI, scheduleAPI } from "../lib/api";
import DateSelect from "../components/DateSelect";
import MovieCard from "../components/MovieCard";

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const showtimeRef = React.useRef(null);
  const [relatedMovies, setRelatedMovies] = useState([]);

  const scrollToShowtime = () => {
    if (showtimeRef.current) {
      showtimeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const fetchMovie = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await movieAPI.getById(id);
      setMovie(response.data);
    } catch (err) {
      console.error("Error fetching movie:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch movie details";
      setError(errorMessage);
      setMovie(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await scheduleAPI.getByMovieId(id);
      setSchedules(response.data);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setSchedules([]);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMovie();
      fetchSchedules();
    }
  }, [id]);

  useEffect(() => {
    if (location?.state?.scrollToShowtime) {
      const timer = setTimeout(() => {
        scrollToShowtime();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location?.state]);

  const getRandomMovies = (movies, currentId, count = 4) => {
    const filtered = movies.filter((m) => m.id !== currentId);
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    return filtered.slice(0, count);
  };

  const fetchRelatedMovies = async () => {
    try {
      const response = await movieAPI.getAll();
      const random4 = getRandomMovies(response.data.movies, movie.id, 4);
      setRelatedMovies(random4);
    } catch (err) {
      setRelatedMovies([]);
    }
  };

  useEffect(() => {
    if (movie) {
      fetchRelatedMovies();
    }
  }, [movie]);

  if (loading) {
    return (
      <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
        <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
          <div className="max-md:mx-auto rounded-xl h-104 max-w-70 bg-gray-700 animate-pulse" />

          <div className="flex flex-col gap-3 flex-1">
            <div className="h-4 bg-gray-700 rounded animate-pulse w-20" />
            <div className="h-10 bg-gray-700 rounded animate-pulse w-80" />
            <div className="h-6 bg-gray-700 rounded animate-pulse w-32" />
            <div className="h-20 bg-gray-700 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-700 rounded animate-pulse w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-center text-red-500">
          {error || "Movie not found"}
        </h1>
        <div className="flex gap-4 mt-4">
          <button
            onClick={fetchMovie}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-20">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Movies
        </button>

        <div className="flex flex-col md:flex-row gap-8">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="max-md:mx-auto rounded-xl h-104 max-w-70 object-cover"
          />

          <div className="relative flex flex-col gap-3">
            <BlurCircle top="-100px" left="-100px" />
            <h1 className="text-4xl font-semibold max-w-96 text-balance">
              {movie.title}
            </h1>

            <div className="flex items-center gap-2 text-gray-300">
              <StarIcon className="w-5 h-5 text-primary fill-primary" />
              <span>{movie.favoritesCount} Movie Rating</span>
            </div>

            <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
              {movie.description}
            </p>

            <p>
              {timeFormat(movie.durationMinutes)} • {movie.genre} •{" "}
              {new Date(movie.releaseDate).getFullYear()}
            </p>

            {movie.trailerUrl && (
              <div className="flex items-center flex-wrap gap-4 mt-4">
                <a
                  href={movie.trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 
                  transition rounded-md font-medium cursor-pointer active:scale-95"
                >
                  <PlayIcon className="w-5 h-5" />
                  Watch Trailer
                </a>
                <button
                  onClick={scrollToShowtime}
                  className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
                >
                  Buy Tickets
                </button>
                <button className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        <DateSelect ref={showtimeRef} dateTime={schedules} id={movie.id} />

        <p className="text-lg font-medium mt-20 mb-8">You May Also Like</p>
        <div className="flex flex-wrap max-sm:justify-center gap-8 mt-8">
          {relatedMovies.length === 0 ? (
            <p className="text-gray-400">Không có phim nào.</p>
          ) : (
            relatedMovies.map((show) => (
              <MovieCard key={show.id} movie={show} />
            ))
          )}
        </div>
        <div className="flex justify-center mt-20">
          <button
            onClick={() => {
              navigate("/movies");
              scrollTo(0, 0);
            }}
            className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
          >
            Show more
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;
