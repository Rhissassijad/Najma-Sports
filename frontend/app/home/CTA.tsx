import styles from "./CTA.module.css";

export default function CTA() {
  return (
    <section className={styles.cta}>

      <h2 className={styles.title}>
        Ready to start your journey?
      </h2>

      <button className={styles.button}>
        Join Now
      </button>

    </section>
  );
}