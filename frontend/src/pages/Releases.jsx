import React, { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { movieAPI } from "../lib/api";
import Loading from "../components/Loading";

const Releases = () => {
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
      setError(
        err.response?.data?.message || err.message || "Failed to fetch movies"
      );
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const comingSoon = movies.filter((m) => {
    if (!m.releaseDate) return false;
    const d = new Date(m.releaseDate);
    d.setHours(0, 0, 0, 0);
    return d > today;
  });

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-center text-red-500">{error}</h1>
        <button
          onClick={fetchMovies}
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

      <h1 className="text-2xl font-semibold my-8">Upcoming Releases</h1>

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

export default Releases;
