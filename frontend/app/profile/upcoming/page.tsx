"use client";

import { useEffect, useState } from "react";
import { useAuthGuard } from "@/lib/withAuth";

export default function UpcomingPage() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/");
  const [matches, setMatches] = useState<any[]>([]);

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
      setMatches(data.upcomingMatches || []);
    };

    fetchData();
  }, []);

  if (isCheckingAuth || !isAuthenticated) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Upcoming Matches</h1>

      {matches.length === 0 ? (
        <p className="text-gray-500 mt-4">No upcoming matches</p>
      ) : (
        <div className="mt-6 space-y-4">
          {matches.map((match) => (
            <div key={match._id} className="bg-[#0055CC] text-white p-6 rounded-xl">
              {match.players.map((p: any) => (
                <p key={p._id}>{p.name}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
