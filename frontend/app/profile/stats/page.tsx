"use client";
import Link from "next/link";

import { individualDiscipline } from "@/lib/sports";
import { isTeamSport } from "@/lib/sports";
import { useEffect, useState } from "react";
import { ratingNumber } from "@/components/RatingPanels";
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

      setRatings(
        (data.ratings || []).filter(
          (r: any) =>
            !isTeamSport(r.sportId?.name) &&
            individualDiscipline(r.sportId?.name, r.discipline)?.mode ===
              "racket",
        ),
      );
      setHistory(
        (data.ratingHistory || []).filter(
          (r: any) =>
            !isTeamSport(r.sportId?.name) &&
            individualDiscipline(r.sportId?.name, r.discipline)?.mode ===
              "racket",
        ),
      );
    };

    fetchData();
  }, []);

  if (isCheckingAuth || !isAuthenticated) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Stats</h1>
      <p>
        <Link href="/compete?section=records">
          Swimming times and golf rounds →
        </Link>
      </p>

      {/* Ratings */}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Current Ratings</h2>

        {ratings.map((r) => (
          <div key={r._id} className="bg-white p-4 rounded-lg shadow mb-2">
            <p>
              {r.sportId?.name} ·{" "}
              {individualDiscipline(r.sportId?.name, r.discipline)?.label}
            </p>
            <p className="font-bold">{ratingNumber(r.currentRating)}</p>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Rating History</h2>

        {history.map((h) => (
          <div key={h._id} className="text-sm text-gray-600">
            {h.sportId?.name} ·{" "}
            {individualDiscipline(h.sportId?.name, h.discipline)?.label}:{" "}
            {ratingNumber(h.previousRating)} → {ratingNumber(h.newRating)} (
            {h.ratingChange > 0 ? "+" : ""}
            {ratingNumber(h.ratingChange)})
          </div>
        ))}
      </div>
    </div>
  );
}
