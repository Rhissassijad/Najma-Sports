import Link from "next/link";
import styles from "./CTA.module.css";

export default function CTA() {
  return (
    <section className={styles.cta}>
      <h2 className={styles.title}>Ready to start your journey?</h2>

      <Link href="/auth/register" className={styles.button}>
        Join Now
      </Link>
    </section>
  );
}
