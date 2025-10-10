import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import MovieCard from "./MovieCard";
import api from "../lib/api";
import React, { useEffect, useState } from "react";

const FeatureSection = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await api.get("/movies");

        const today = new Date();

        const nowShowing = res.data.movies
          .filter((movie) => new Date(movie.releaseDate) <= today)
          .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

        setMovies(nowShowing);
      } catch (err) {
        setError("Không thể tải danh sách phim.");
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      <div className="relative flex items-center justify-between pt-20 pb-10">
        <BlurCircle top="0" right="-80px" />
        <p className="text-gray-300 font-medium text-lg">Now Showing</p>
        <button
          onClick={() => navigate("/movies")}
          className="group flex items-center gap-2 text-sm text-gray-300"
        >
          View All
          <ArrowRight className="group-hover:translate-x-0.5 transition w-4.5 h-4.5" />
        </button>
      </div>

      <div className="flex flex-wrap max-sm:justify-center gap-8 mt-8">
        {loading ? (
          <p className="text-gray-400">Loading movies...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : movies.length === 0 ? (
          <p className="text-gray-400">Không có phim nào.</p>
        ) : (
          movies
            .slice(0, 4)
            .map((show) => <MovieCard key={show.id} movie={show} />)
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
  );
};

export default FeatureSection;
