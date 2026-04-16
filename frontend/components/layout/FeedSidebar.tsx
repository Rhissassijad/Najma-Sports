"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./FeedSidebar.module.css";

const feedItems = [
  { label: "Feed", href: "/feed", section: "feed" },
  { label: "Trending", href: "/feed?section=trending", section: "trending" },
  { label: "My Sports", href: "/feed?section=my-sports", section: "my-sports" },
  { label: "My Communities", href: "/feed?section=my-communities", section: "my-communities" },
];

export default function FeedSidebar() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "feed";

  return (
    <aside className={styles.aside}>
      <nav className={styles.nav}>
        <div className={styles.header}>
          <h2 className={styles.title}>Community Feed</h2>
          <p className={styles.subtitle}>Personalized stream</p>
          <a href="#create-post" className={styles.createPostButton}>
            + Create Post
          </a>
        </div>

        <ul className={styles.list}>
          {feedItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`${styles.itemLink} ${item.section === section ? styles.itemLinkActive : ""}`}
              >
                <span className={styles.dot} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
