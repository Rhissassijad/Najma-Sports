"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>YOUR GAME. YOUR NEXT LEVEL.</p>

      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={styles.title}
      >
        Find your people.{" "}
        <span className={styles.highlight}>Raise your game.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className={styles.description}
      >
        Find your next opponent, make every match count, and follow your
        progress. Your sports journey starts here.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className={styles.buttons}
      >
        <Link href="/auth/register" className={styles.primaryButton}>
          Start Competing
        </Link>

        <Link
          href="/compete?section=leaderboard"
          className={styles.secondaryButton}
        >
          Explore Rankings
        </Link>
      </motion.div>

      <p className={styles.caption}>
        INDIVIDUAL SPORTS · TEAM SPORTS · YOUR NEXT LEVEL
      </p>
    </section>
  );
}
