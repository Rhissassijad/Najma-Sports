"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CountryOption = {
  code: string;
  name: string;
};

const FALLBACK_REGION_CODES = ["US", "CA", "GB", "FR", "DE", "ES", "IT", "BR", "MX", "JP", "CN", "IN"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function buildCountryOptions(): CountryOption[] {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") {
    return FALLBACK_REGION_CODES.map((code) => ({ code, name: code }));
  }

  const regionNames = new Intl.DisplayNames(["en"], {
    type: "region",
    fallback: "code",
  });

  const dynamicRegions: CountryOption[] = [];

  for (const firstLetter of LETTERS) {
    for (const secondLetter of LETTERS) {
      const code = `${firstLetter}${secondLetter}`;
      const name = regionNames.of(code);

      if (name && name !== code) {
        dynamicRegions.push({ code, name });
      }
    }
  }

  return dynamicRegions
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function RegisterPage() {
  const router = useRouter();

  const countryOptions = useMemo(() => buildCountryOptions(), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      setError("Please provide a valid date of birth.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneCountry,
          phoneNumber,
          gender,
          dateOfBirth,
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Registration failed.");
      }

      router.push("/auth/login");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleRegister}
      className="bg-white p-8 rounded-xl shadow-md"
    >
      <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>

      {error && (
        <p className="text-red-500 mb-4 text-sm">{error}</p>
      )}

      <input
        type="text"
        placeholder="First Name"
        className="w-full mb-4 px-4 py-3 border rounded-lg"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Last Name"
        className="w-full mb-4 px-4 py-3 border rounded-lg"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        required
      />

      <input
        type="email"
        placeholder="Email Address"
        className="w-full mb-4 px-4 py-3 border rounded-lg"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <select
        className="w-full mb-4 px-4 py-3 border rounded-lg bg-white"
        value={phoneCountry}
        onChange={(e) => setPhoneCountry(e.target.value)}
        required
      >
        <option value="">Country/Region</option>
        {countryOptions.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name} ({country.code})
          </option>
        ))}
      </select>

      <input
        type="tel"
        placeholder="Phone Number"
        className="w-full mb-4 px-4 py-3 border rounded-lg"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        required
      />

      <select
        className="w-full mb-4 px-4 py-3 border rounded-lg bg-white"
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        required
      >
        <option value="">Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Non-binary">Non-binary</option>
        <option value="Prefer not to say">Prefer not to say</option>
      </select>

      <input
        type="date"
        className="w-full mb-4 px-4 py-3 border rounded-lg"
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
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

      <input
        type="password"
        placeholder="Confirm Password"
        className="w-full mb-6 px-4 py-3 border rounded-lg"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0055CC] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
      >
        {loading ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
}
