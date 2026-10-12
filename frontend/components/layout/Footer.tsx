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
            Compete, track performance, and climb rankings across your favorite sports.
          </p>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Contact</h3>
          <ul className={styles.linkList}>
            <li><Link href="/help" className={styles.link}>Help Center</Link></li>
            <li><Link href="/support" className={styles.link}>Support</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>About Us</h3>
          <ul className={styles.linkList}>
            <li><Link href="/about" className={styles.link}>Our Mission</Link></li>
            <li><Link href="/how-it-works" className={styles.link}>How It Works</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Help</h3>
          <ul className={styles.linkList}>
            <li><Link href="/faq" className={styles.link}>FAQ</Link></li>
            <li><Link href="/terms" className={styles.link}>Terms</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Stay In Touch</h3>
          <ul className={styles.linkList}>
            <li><Link href="https://www.instagram.com" className={styles.link}>Instagram</Link></li>
            <li><Link href="https://x.com" className={styles.link}>X / Twitter</Link></li>
            <li><Link href="https://www.facebook.com" className={styles.link}>Facebook</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>© {new Date().getFullYear()} RyadaZone. All rights reserved.</div>
    </footer>
  );
}
