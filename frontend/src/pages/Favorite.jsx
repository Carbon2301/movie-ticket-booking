import React, { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { movieAPI } from "../lib/api";
import Loading from "../components/Loading";

const Favorite = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await movieAPI.getFavorites();
      setMovies(Array.isArray(res.data) ? res.data : res.data.movies);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch favorites";
      setError(errorMessage);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleFavoriteToggle = () => {
    fetchFavorites();
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-center text-red-500">{error}</h1>
        <button
          onClick={fetchFavorites}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 xl:px-44 py-20 pt-30 min-h-screen overflow-hidden">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      <h1 className="text-2xl font-semibold my-8 flex items-center gap-2">
        Your Favorite Movies
      </h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {movies.length ? (
          movies.map((movie) => (
            <MovieCard
              movie={movie}
              key={movie.id}
              onFavoriteToggle={handleFavoriteToggle}
              hideFavCount
            />
          ))
        ) : (
          <div className="w-full text-center text-lg py-8 text-muted-foreground">
            You haven't added any movies to your favorites yet.
            <br />
            Click the <span className="font-bold text-primary">❤️</span> button
            on any movie to add it to your list!
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorite;
