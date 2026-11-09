import styles from "./auth.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>WELCOME TO NAJMASPORTS</span>
            <h2>
              Your next chapter
              <br />
              starts on court.
            </h2>
            <p>
              Connect with other players, compete at your level, and follow your
              progress. One match at a time.
            </p>
          </div>
          <footer>PLAY. CONNECT. PROGRESS.</footer>
        </aside>
        <div className={styles.form}>{children}</div>
      </div>
    </div>
  );
}
