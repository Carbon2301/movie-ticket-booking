import React, { useEffect, useState } from "react";
import api from "../lib/api";
import BlurCircle from "./BlurCircle";
import { PlayCircleIcon } from "lucide-react";
import Loading from "./Loading";

function toYoutubeEmbed(url) {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/
  );
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

const TrailersSection = () => {
  const [trailers, setTrailers] = useState([]);
  const [currentTrailer, setCurrentTrailer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTrailers = async () => {
      try {
        const res = await api.get("/movies/top-favorites");
        const movies = Array.isArray(res.data)
          ? res.data
          : res.data.movies || [];
        const trailersData = movies
          .filter((m) => m.trailerUrl)
          .map((m) => ({
            videoUrl: toYoutubeEmbed(m.trailerUrl),
            image: m.posterUrl,
            title: m.title,
          }));
        setTrailers(trailersData);
        setCurrentTrailer(trailersData[0] || null);
      } catch (err) {
        setError("Không thể tải trailer phim.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrailers();
  }, []);

  if (loading) {
    return <Loading />;
  }
  if (error || !trailers.length) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500 text-xl">
        {error || "Không có trailer."}
      </div>
    );
  }

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden">
      <p className="text-gray-300 font-medium text-lg max-w-[960px] mx-auto">
        Trailers
      </p>
      <div className="relative mt-6">
        <BlurCircle top="-100px" right="-100px" />
        {currentTrailer && (
          <iframe
            width="100%"
            height="540"
            src={currentTrailer.videoUrl}
            title={currentTrailer.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg mx-auto max-w-[960px] w-full"
          />
        )}
      </div>
      <div className=" group grid grid-cols-5 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto">
        {trailers.map((trailer, idx) => (
          <div
            key={trailer.image + idx}
            className="relative group-hover:not-hover:opacity-50 hover:-translate-y-1 duration-300 transition max-md:h-60 md:max-h-60 cursor-pointer"
            onClick={() => setCurrentTrailer(trailer)}
          >
            <img
              src={trailer.image}
              alt="trailer"
              className="rounded-lg w-full h-full object-cover brightness-75"
            />
            <PlayCircleIcon
              strokeWidth={1.6}
              className="absolute top-1/2 left-1/2 w-8 h-8 md:w-10 md:h-10 transform -translate-x-1/2 -translate-y-1/2 text-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrailersSection;
