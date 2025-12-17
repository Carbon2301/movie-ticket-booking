import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";
import Loading from "../components/Loading";

const Cinemas = () => {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/cinemas");
        setCinemas(res.data.cinemas || []);
      } catch {
        setError("Failed to load cinemas");
      } finally {
        setLoading(false);
      }
    };
    fetchCinemas();
  }, []);

  return (
    <div className="relative px-6 md:px-16 lg:px-40 xl:px-44 py-20 pt-30 min-h-screen background-color">
      <h1 className="text-2xl font-semibold my-8 flex items-center gap-2">
        All Cinemas
      </h1>
      <BlurCircle top="100px" left="0px" />
      <BlurCircle bottom="0px" right="100px" />

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="flex justify-center py-10">
          <span className="text-red-500 text-lg">{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cinemas.length === 0 ? (
            <div className="col-span-full text-center text-lg text-muted-foreground">
              No cinemas found.
            </div>
          ) : (
            cinemas.map((cinema) => (
              <div
                key={cinema.id}
                className="p-5 bg-gray-800 rounded-xl shadow flex flex-col gap-2 hover:-translate-y-1 transition cursor-pointer"
                onClick={() => navigate(`/cinemas/${cinema.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="font-bold text-xl mb-1 text-white">
                      {cinema.name}
                    </h2>
                    <p className="text-gray-100 text-sm">{cinema.location}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/cinemas/${cinema.id}`);
                  }}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 text-sm w-max"
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Cinemas;
