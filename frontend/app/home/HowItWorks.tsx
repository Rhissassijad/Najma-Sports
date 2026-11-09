import styles from "./HowItWorks.module.css";
import { UserPlus, Users, TrendingUp } from "lucide-react";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.howItWorks}>
      <h2 className={styles.title}>How it works</h2>

      <div className={styles.grid}>
        <div className={styles.step}>
          <div className={styles.iconContainer}>
            <UserPlus className={styles.icon} />
          </div>
          <h3 className={styles.stepTitle}>Create your profile</h3>

          <p className={styles.description}>
            Sign up, choose your favorite sports, and personalize your athlete
            profile to get started.
          </p>
        </div>

        <div className={styles.step}>
          <h3 className={styles.stepTitle}>
            <Users className={styles.icon} />
            Explore & Connect
          </h3>

          <p className={styles.description}>
            Discover sports communities, connect with other athletes, and find
            activities that interest you.
          </p>
        </div>

        <div className={styles.step}>
          <h3 className={styles.stepTitle}>
            <TrendingUp className={styles.icon} />
            Get in the game!
          </h3>

          <p className={styles.description}>
            Join a community, share your first post, or find an opponent and
            start your sports journey.
          </p>
        </div>
      </div>
    </section>
  );
}
