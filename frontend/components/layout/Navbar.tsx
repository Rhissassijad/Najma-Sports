"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const path = usePathname();
  const links = [
    { href: "/compete", label: "Compete" },
    { href: "/feed", label: "Community" },
    { href: "/compete?section=leaderboard", label: "Rankings" },
    { href: "/profile", label: "My profile" },
  ];
  const navigation = links.map((link) => (
    <Link
      key={link.label}
      href={link.href}
      className={styles.primaryLink}
      aria-current={
        !link.href.includes("?") && path === link.href ? "page" : undefined
      }
      onClick={() => setMenuOpen(false)}
    >
      {link.label}
    </Link>
  ));

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Najma<span className={styles.brandAccent}>Sports</span>
        </Link>

        <div className={styles.primaryLinks}>{navigation}</div>
        <div className={styles.authGroup}>
          {user ? (
            <>
              <button onClick={logout} className={styles.logoutButton}>
                Logout
              </button>
              <Link
                href="/profile"
                className={styles.userBubble}
                aria-label="Profile"
              >
                {user?.email?.[0]?.toUpperCase() || "U"}
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={styles.loginLink}>
                Login
              </Link>
              <Link href="/auth/register" className={styles.signUpButton}>
                Sign Up
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className={styles.mobileMenu}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {menuOpen && (
        <div id="mobile-navigation" className={styles.mobileLinks}>
          {navigation}
        </div>
      )}
    </nav>
  );
}
