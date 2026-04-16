"use client";

import { useEffect, useState } from "react";
import { useAuthGuard } from "@/lib/withAuth";

export default function StatsPage() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/");
  const [ratings, setRatings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:8080/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setRatings(data.ratings || []);
      setHistory(data.ratingHistory || []);
    };

    fetchData();
  }, []);

  if (isCheckingAuth || !isAuthenticated) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Stats</h1>

      {/* Ratings */}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Current Ratings</h2>

        {ratings.map((r) => (
          <div key={r._id} className="bg-white p-4 rounded-lg shadow mb-2">
            <p>{r.sportId?.name}</p>
            <p className="font-bold">{r.currentRating}</p>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Rating History</h2>

        {history.map((h) => (
          <div key={h._id} className="text-sm text-gray-600">
            {h.previousRating} → {h.newRating} ({h.ratingChange > 0 ? "+" : ""}{h.ratingChange})
          </div>
        ))}
      </div>

    </div>
  );
}
