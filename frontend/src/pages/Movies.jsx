import React, { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { movieAPI } from "../lib/api";

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await movieAPI.getAll();
      setMovies(res.data.movies);
    } catch (err) {
      console.error("Error fetching movies:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to fetch movies";
      setError(errorMessage);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const retryFetch = () => {
    fetchMovies();
  };

  useEffect(() => {
    fetchMovies();
  }, []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nowShowing = movies.filter((m) => {
    if (!m.releaseDate) return false;
    const d = new Date(m.releaseDate);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  });

  const comingSoon = movies.filter((m) => {
    if (!m.releaseDate) return false;
    const d = new Date(m.releaseDate);
    d.setHours(0, 0, 0, 0);
    return d > today;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-center">Loading movies...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-center text-red-500">{error}</h1>
        <button
          onClick={retryFetch}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 xl:px-44 py-20 pt-30 min-h-screen background-color overflow-hidden">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      {/* Now Showing */}
      <h1 className="text-2xl font-semibold my-8 flex items-center gap-2">
        Now Showing
      </h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8 mb-12">
        {nowShowing.length ? (
          nowShowing.map((movie) => <MovieCard movie={movie} key={movie.id} />)
        ) : (
          <div className="w-full text-center text-lg py-8">
            No movies currently showing
          </div>
        )}
      </div>

      {/* Coming Soon */}
      <h1 className="text-2xl font-semibold my-8 flex items-center gap-2">
        Coming Soon
      </h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {comingSoon.length ? (
          comingSoon.map((movie) => <MovieCard movie={movie} key={movie.id} />)
        ) : (
          <div className="w-full text-center text-lg py-8">
            No upcoming movies
          </div>
        )}
      </div>
    </div>
  );
};

export default Movies;
