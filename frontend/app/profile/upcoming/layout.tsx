import Link from "next/link";
import styles from "../subpage.module.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.page}>
      <Link href="/profile" className={styles.back}>
        ← Back to profile
      </Link>
      {children}
    </section>
  );
}
