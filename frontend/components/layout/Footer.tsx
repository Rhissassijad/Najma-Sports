import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.brand}>
            Najma<span className={styles.brandAccent}>Sports</span>
          </Link>
          <p className={styles.brandText}>
            Your people. Your progress. Your next match.
            <br />
            Make every point count.
          </p>
        </div>
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Play</h3>
          <Link href="/compete" className={styles.link}>
            Find a match
          </Link>
          <Link href="/compete?section=leaderboard" className={styles.link}>
            Player rankings
          </Link>
          <Link href="/profile" className={styles.link}>
            My profile
          </Link>
        </div>
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Connect</h3>
          <Link href="/feed" className={styles.link}>
            Community feed
          </Link>
          <Link href="/#features" className={styles.link}>
            About NajmaSports
          </Link>
          <Link href="/#how-it-works" className={styles.link}>
            How it works
          </Link>
        </div>
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Your next level</h3>
          <p className={styles.brandText}>A place for every player.</p>
          <Link href="/auth/register" className={styles.join}>
            Join the community →
          </Link>
        </div>
      </div>
      <div className={styles.bottom}>
        © {new Date().getFullYear()} NajmaSports. All rights reserved.
        <span>Built around the love of the game.</span>
      </div>
    </footer>
  );
}
