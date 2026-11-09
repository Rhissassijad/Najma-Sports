"use client";

import Link from "next/link";
import { Trophy, Users, Activity } from "lucide-react";
import { useAuthGuard } from "@/lib/withAuth";
import styles from "./page.module.css";

const destinations = [
  {
    href: "/compete",
    icon: Trophy,
    title: "Your next match",
    text: "Find an opponent, record a result, and make your next move.",
    action: "Start competing",
  },
  {
    href: "/profile",
    icon: Activity,
    title: "Your player journey",
    text: "See your sports, follow your rating, and keep your profile up to date.",
    action: "View my profile",
  },
  {
    href: "/feed",
    icon: Users,
    title: "Your community",
    text: "Catch up with other players and share what’s happening in your game.",
    action: "Explore the feed",
  },
];
export default function Dashboard() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/auth/login");
  if (isCheckingAuth || !isAuthenticated) return null;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p>YOUR HOME COURT</p>
        <h1>Back in the game.</h1>
        <span>There’s always a next level. Make today count.</span>
      </header>
      <div className={styles.grid}>
        {destinations.map(({ icon: Icon, ...item }) => (
          <Link href={item.href} key={item.href} className={styles.card}>
            <Icon size={24} />
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <span>{item.action} →</span>
          </Link>
        ))}
      </div>
      <section className={styles.banner}>
        <div>
          <h2>See where you stand.</h2>
          <p>Explore the player rankings for your favorite sport.</p>
        </div>
        <Link href="/compete?section=leaderboard">View leaderboard →</Link>
      </section>
    </main>
  );
}
