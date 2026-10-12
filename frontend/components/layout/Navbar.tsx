"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Najma<span className={styles.brandAccent}>Sports</span>
        </Link>

        <div className={styles.primaryLinks}>
          <Link href="/compete" className={styles.primaryLink}>Compete</Link>
          <Link href="/feed" className={styles.primaryLink}>Feed</Link>
          <Link href="/rankings" className={styles.primaryLink}>Discover</Link>
          <Link href="/marketplace" className={styles.primaryLink}>Marketplace</Link>
        </div>

        <div className={styles.ctaGroup}>
          <Link href="/compete" className={styles.ctaLink}>Compete</Link>
          <Link href="/feed" className={styles.ctaLink}>Feed</Link>
        </div>

        <div className={styles.authGroup}>
          {user ? (
            <>
              <button onClick={logout} className={styles.logoutButton}>
                Logout
              </button>
              <Link href="/profile" className={styles.userBubble} aria-label="Profile">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={styles.loginLink}>
                Login
              </Link>
              <Link href="/auth/register">
                <button className={styles.signUpButton}>Sign Up</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
