"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  BarChart3,
  Target,
  UsersIcon,
  MessageCircleIcon,
  Folder,
  LocationEditIcon,
  Medal,
  ShoppingBag,
  ShoppingBasket,
  LucideShoppingCart,
} from "lucide-react";
import styles from "./Features.module.css";

const features = [
  {
    title: "Track Performance",
    description:
      "Monitor your match history, wins, losses, and performance statistics. Follow your progress over time and see how your results affect your rating.",
    icon: BarChart3,
  },
  {
    title: "Compete & climb rankings",
    description:
      "Challenge other athletes, record match results, and earn rating points. Compare your performance with other players through sport-specific leaderboards.",
    icon: Trophy,
  },
  {
    title: "Improve your game",
    description:
      "Review your results, identify areas for improvement, and set personal goals. Use your match history and rating progression to measure your development.",
    icon: Target,
  },
  {
    title: "Find players & matches",
    description:
      "Discover athletes who share your interests, find opponents, and connect with players near you. Find opportunities to compete at your preferred level.",
    icon: UsersIcon,
  },
  {
    title: "Join sports communities",
    description:
      "Create or join communities dedicated to your favorite sports. Share experiences, discuss matches, and connect with athletes who share your passion.",
    icon: MessageCircleIcon,
  },
  {
    title: "Share your sports journey",
    description:
      "Create posts, share your achievements, and follow activity from other athletes. Stay connected with your sports community through a personalized feed.",
    icon: Folder,
  },
  {
    title: "Tournaments · Coming soon",
    description:
      "A new way to bring your competitive community together. Tournament discovery and registration are planned.",
    icon: Medal,
  },
  {
    title: "Marketplace · Coming soon",
    description:
      "A space for sports equipment and accessories is on the roadmap. Stay focused on your game while we build it.",
    icon: LucideShoppingCart,
  },
];

export default function Features() {
  return (
    <section id="features" className={styles.features}>
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={styles.title}
      >
        More than a score.
      </motion.h2>

      <div className={styles.grid}>
        {features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className={styles.card}
            >
              <div className={styles.iconContainer}>
                <Icon className={styles.icon} />
              </div>

              <h3 className={styles.cardTitle}>{feature.title}</h3>

              <p className={styles.description}>{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
