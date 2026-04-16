"use client";

import { useEffect, useState } from "react";
import { useAuthGuard } from "@/lib/withAuth";

export default function InfoPage() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/");
  const [user, setUser] = useState<any>(null);

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
      setUser(data.user);
    };

    fetchData();
  }, []);

  if (isCheckingAuth || !isAuthenticated) return null;

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile Info</h1>

      <div className="mt-6 space-y-2">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
