"use client";

import {
  disciplines,
  ALL_SPORTS,
  TEAM_SPORTS,
  INDIVIDUAL_SPORTS,
  isTeamSport,
} from "@/lib/sports";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";
import { useRouter } from "next/navigation";

type CountryOption = {
  code: string;
  name: string;
};

const FALLBACK_REGION_CODES = [
  "US",
  "CA",
  "GB",
  "FR",
  "DE",
  "ES",
  "IT",
  "BR",
  "MX",
  "JP",
  "CN",
  "IN",
];
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

  return dynamicRegions.sort((a, b) => a.name.localeCompare(b.name));
}

export default function RegisterPage() {
  const router = useRouter();

  // Resolve browser region names after hydration: Node and Chromium can use different ICU labels.
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  useEffect(() => {
    setCountryOptions(buildCountryOptions());
  }, []);

  const [startingDiscipline, setStartingDiscipline] = useState("singles");
  const [startingSport, setStartingSport] = useState("Tennis");
  const [category, setCategory] = useState("both");
  const [intent, setIntent] = useState("player");
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
          onboarding: {
            category,
            intent,
            sport: startingSport,
            discipline: !isTeamSport(startingSport)
              ? startingDiscipline
              : undefined,
          },
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

      if (isTeamSport(startingSport) || intent !== "player")
        router.push(
          "/auth/login?next=" +
            encodeURIComponent(
              "/compete?section=teams&sport=" +
                (isTeamSport(startingSport) ? startingSport : "Soccer"),
            ),
        );
      else
        router.push(
          "/auth/login?next=" +
            encodeURIComponent(
              `/compete?sport=${encodeURIComponent(startingSport)}&discipline=${encodeURIComponent(startingDiscipline)}&section=${["Swimming", "Golf"].includes(startingSport) ? "records" : "find"}`,
            ),
        );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded-xl shadow-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>

        {error && (
          <p role="alert" className="text-red-500 mb-4 text-sm">
            {error}
          </p>
        )}

        <label className={styles.fieldLabel} htmlFor="sport-category">
          Which sports interest you?
        </label>
        <select
          id="sport-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setStartingDiscipline("singles");
            if (e.target.value === "individual") setIntent("player");
            setStartingSport(
              e.target.value === "team" ? TEAM_SPORTS[0] : INDIVIDUAL_SPORTS[0],
            );
          }}
        >
          <option value="both">Team and individual sports</option>
          <option value="team">
            Team sports · soccer, volleyball, football and more
          </option>
          <option value="individual">
            Individual sports · tennis, padel, pickleball
          </option>
        </select>
        <label className={styles.fieldLabel} htmlFor="starting-sport">
          Sport to start with
        </label>
        <select
          id="starting-sport"
          value={startingSport}
          onChange={(e) => {
            setStartingSport(e.target.value);
            setStartingDiscipline(disciplines(e.target.value)[0]?.id || "");
          }}
        >
          {(category === "team"
            ? TEAM_SPORTS
            : category === "individual"
              ? INDIVIDUAL_SPORTS
              : ALL_SPORTS
          ).map((sport) => (
            <option key={sport}>{sport}</option>
          ))}
        </select>
        {disciplines(startingSport).length > 0 && (
          <label className={styles.fieldLabel}>
            Starting discipline / event
            <select
              value={startingDiscipline}
              onChange={(e) => setStartingDiscipline(e.target.value)}
            >
              {disciplines(startingSport).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={styles.fieldLabel} htmlFor="participation">
          How would you like to get started?
        </label>
        <select
          id="participation"
          value={intent}
          onChange={(e) => {
            setIntent(e.target.value);
            if (e.target.value !== "player" && !isTeamSport(startingSport))
              setStartingSport("Soccer");
          }}
        >
          <option value="player">Play as an individual</option>
          {category !== "individual" && (
            <option value="manage">Create or manage a squad / club</option>
          )}
          {category !== "individual" && (
            <option value="join">Join an existing squad</option>
          )}
        </select>
        <p className={styles.switch}>
          One personal login, all your sports. Clubs are organizations you
          manage, not shared accounts. You can add other sports and roles later.
        </p>
        <label className={styles.fieldLabel} htmlFor="first-name">
          First Name
        </label>
        <input
          id="first-name"
          type="text"
          placeholder="First Name"
          className="w-full mb-4 px-4 py-3 border rounded-lg"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />

        <label className={styles.fieldLabel} htmlFor="last-name">
          Last Name
        </label>
        <input
          id="last-name"
          type="text"
          placeholder="Last Name"
          className="w-full mb-4 px-4 py-3 border rounded-lg"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />

        <label className={styles.fieldLabel} htmlFor="email-address">
          Email Address
        </label>
        <input
          id="email-address"
          type="email"
          placeholder="Email Address"
          className="w-full mb-4 px-4 py-3 border rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <select
          aria-label="Country or region"
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

        <label className={styles.fieldLabel} htmlFor="phone-number">
          Phone Number
        </label>
        <input
          id="phone-number"
          type="tel"
          placeholder="Phone Number"
          className="w-full mb-4 px-4 py-3 border rounded-lg"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />

        <select
          aria-label="Gender"
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

        <label className={styles.fieldLabel} htmlFor="date-of-birth">
          Date of birth
        </label>
        <input
          id="date-of-birth"
          type="date"
          className="w-full mb-4 px-4 py-3 border rounded-lg"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          required
        />

        <label className={styles.fieldLabel} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          className="w-full mb-6 px-4 py-3 border rounded-lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className={styles.fieldLabel} htmlFor="confirm-password">
          Confirm Password
        </label>
        <input
          id="confirm-password"
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
      <p className={styles.switch}>
        Already a player? <Link href="/auth/login">Sign in</Link>
      </p>
    </>
  );
}
