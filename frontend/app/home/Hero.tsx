"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>

      <div className={styles.glow} />

      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={styles.title}
      >
        Compete, Improve,{" "}
        <span className={styles.highlight}>
          Dominate the Rankings
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className={styles.description}
      >
        Najma Sports is the ultimate platform for tracking your performance,
        competing with others, and climbing the global ranking system.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className={styles.buttons}
      >
        <Link href="/login" className={styles.primaryButton}>
          Start Competing
        </Link>

        <Link href="/rankings" className={styles.secondaryButton}>
          Explore Rankings
        </Link>
      </motion.div>

    </section>
  );
}