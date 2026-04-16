"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("🔑 TOKEN:", token);

        // 🔐 Redirect if not logged in
        if (!token) {
          window.location.href = "/auth/login";
          return;
        }

        console.log("➡️ Fetching profile...");

        const res = await fetch("http://localhost:8080/api/auth/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("⬅️ Response status:", res.status);

        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        console.log("✅ User data:", data);

        setUser(data);

      } catch (error) {
        console.error("❌ Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ⏳ Loading state
  if (loading) {
    return (
      <p className="text-center mt-20 text-gray-500">
        Loading profile...
      </p>
    );
  }

  // ❌ No user
  if (!user) {
    return (
      <p className="text-center mt-20 text-red-500">
        No user found
      </p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-24 px-6">

      <div className="bg-white shadow-lg rounded-2xl p-8 text-center">

        {/* Avatar */}
        <div className="w-24 h-24 mx-auto rounded-full bg-[#0055CC] text-white flex items-center justify-center text-3xl font-bold">
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>

        {/* Name */}
        <h1 className="text-2xl font-bold mt-4">
          {user.name || "No Name"}
        </h1>

        {/* Email */}
        <p className="text-gray-500">
          {user.email}
        </p>

        {/* Button */}
        <button className="mt-6 px-6 py-2 bg-[#0055CC] text-white rounded-lg hover:opacity-90 transition">
          Edit Profile
        </button>

      </div>

    </div>
  );
}