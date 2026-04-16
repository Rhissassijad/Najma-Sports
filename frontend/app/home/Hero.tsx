"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center py-28 px-6 bg-gradient-to-b from-white to-[#E5E7EB] overflow-hidden">

      {/* Glow */}
      <div className="absolute w-[500px] h-[500px] bg-[#0055CC]/10 rounded-full blur-3xl top-[-100px]" />

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl"
      >
        Compete. Improve.{" "}
        <span className="text-[#0055CC]">Dominate the Rankings.</span>
      </motion.h1>

      {/* Paragraph */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mt-6 text-lg md:text-xl max-w-2xl text-gray-600"
      >
        RyadaZone is the ultimate platform for tracking your performance, competing with others,
        and climbing the global ranking system.
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-10 flex gap-4 flex-wrap justify-center"
      >
        {/* Start Competing → login */}
        <Link href="/login">
          <button className="bg-[#0055CC] text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:scale-105 transition">
            Start Competing
          </button>
        </Link>

        {/* Explore Rankings */}
        <Link href="/rankings">
          <button className="border border-[#0055CC] text-[#0055CC] px-8 py-3 rounded-xl text-lg font-semibold hover:bg-[#0055CC] hover:text-white transition">
            Explore Rankings
          </button>
        </Link>
      </motion.div>

    </section>
  );
}