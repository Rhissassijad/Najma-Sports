"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("➡️ LOGIN CLICKED");
    console.log("📧 Email:", email);
    console.log("🔑 Password length:", password.length);

    setLoading(true);
    setError("");

    try {
      console.log("➡️ Preparing request...");

      const url = "http://localhost:8080/api/auth/login";
      console.log("🌐 Request URL:", url);

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      };

      console.log("📦 Request options:", options);

      console.log("➡️ Sending request...");

      const res = await fetch(url, options);

      console.log("⬅️ Response received");
      console.log("📊 Status:", res.status);
      console.log("📊 OK:", res.ok);

      const rawText = await res.text();
      console.log("📄 Raw response:", rawText);

      let data;
      try {
        data = JSON.parse(rawText);
        console.log("✅ Parsed JSON:", data);
      } catch (err) {
        console.warn("⚠️ Response is not valid JSON");
      }

      if (!res.ok) {
        console.error("❌ Backend returned error:", data);
        throw new Error(data?.message || "Login failed");
      }

      console.log("🎉 Login successful:", data);

      login(data.token);
      router.push("/profile");

    } catch (err: any) {
      console.error("❌ FETCH ERROR:", err);

      if (err instanceof TypeError) {
        console.error("🔥 NETWORK ERROR → backend NOT reached");
      }

      setError(err.message || "Something went wrong");

    } finally {
      setLoading(false);
      console.log("➡️ Login process finished");
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      className="bg-white p-8 rounded-xl shadow-md"
    >
      <h1 className="text-2xl font-bold mb-6 text-center">
        Login
      </h1>

      {error && (
        <p className="text-red-500 mb-4 text-sm">
          {error}
        </p>
      )}

      <input
        type="email"
        placeholder="Email"
        className="w-full mb-4 px-4 py-3 border rounded-lg"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full mb-6 px-4 py-3 border rounded-lg"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0055CC] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}