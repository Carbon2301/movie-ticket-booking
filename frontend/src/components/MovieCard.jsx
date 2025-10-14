import { Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import timeFormat from "../lib/timeFormat";
import { movieAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";

const MovieCard = ({ movie, hideFavCount }) => {
  const navigate = useNavigate();
  const { isLoggedIn, auth } = useAuth();
  const token = auth.accessToken;

  if (!movie) return null;

  const [isFav, setIsFav] = useState(!!movie.isFavorited);
  const [favCount, setFavCount] = useState(
    typeof movie.favoritesCount === "number" ? movie.favoritesCount : 0
  );

  useEffect(() => {
    setIsFav(!!movie.isFavorited);
    setFavCount(
      typeof movie.favoritesCount === "number" ? movie.favoritesCount : 0
    );

    if (typeof movie.isFavorited !== "boolean" && token) {
      movieAPI
        .checkFavoriteStatus(movie.id, token)
        .then((res) => {
          if (typeof res.data?.favorited === "boolean") {
            setIsFav(res.data.favorited);
          }
        })
        .catch(() => {});
    }
  }, [movie.id, token]);

  const handleClick = () => {
    navigate(`/movies/${movie.id}`);
    scrollTo(0, 0);
  };

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      toast.error("Vui lòng đăng nhập để thêm vào yêu thích!");
      setTimeout(() => {
        navigate("/login");
      }, 800);
      return;
    }
    try {
      const res = await movieAPI.toggleFavorite(movie.id, token);
      const nextFavorited = res.data?.favorited;
      const countFromServer = res.data?.favoritesCount;
      setIsFav(nextFavorited);
      setFavCount((prev) =>
        typeof countFromServer === "number"
          ? countFromServer
          : Math.max(0, prev + (nextFavorited ? 1 : -1))
      );
    } catch (err) {
      toast.error("Lỗi khi thêm vào yêu thích!");
      console.error("Error toggling favorite:", err);
    }
  };

  return (
    <div
      className="flex flex-col justify-between p-3 bg-gray-800 rounded-2xl
      hover:-translate-y-1 transition duration-300 w-66"
    >
      <img
        onClick={handleClick}
        src={movie.posterUrl || "https://via.placeholder.com/300x200"}
        alt={movie.title || "Movie"}
        className="rounded-lg h-52 w-full object-cover object-right-bottom cursor-pointer"
      />

      <p className="font-semibold mt-2 truncate">{movie.title}</p>

      <p className="text-sm text-gray-400 mt-2">
        {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ""} •{" "}
        {movie.genre || ""} •{" "}
        {movie.durationMinutes ? timeFormat(movie.durationMinutes) : ""}
      </p>

      <div className="flex items-center justify-between mt-4 pb-3">
        <button
          onClick={handleClick}
          className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull 
            transition rounded-full font-medium cursor-pointer"
        >
          Buy Tickets
        </button>

        <button
          className="flex items-center gap-1 text-sm mt-1 pr-1 group"
          onClick={handleToggleFavorite}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
          disabled={!isLoggedIn}
        >
          <Star
            className={`w-5 h-5 transition 
              ${
                isFav
                  ? "text-primary fill-primary"
                  : "text-primary fill-none stroke-primary group-hover:fill-primary/30"
              }`}
            fill={isFav ? "currentColor" : "none"}
            stroke="currentColor"
          />

          {!hideFavCount && (
            <span
              className={`ml-1 font-medium ${
                isFav ? "text-primary" : "text-gray-400"
              }`}
            >
              {favCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default MovieCard;
