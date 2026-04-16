"use client";

import { Users, MapPin, TrendingUp, Trophy, Award, Calendar, MoreVertical } from "lucide-react";
import styles from "./Sidebar.module.css";

type Section =
  | "find-players"
  | "matches"
  | "rating"
  | "leaderboard"
  | "venues"
  | "tournaments";

function SidebarItem({
  icon,
  text,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li onClick={onClick} className={`${styles.item} ${active ? styles.itemActive : styles.itemInactive}`}>
      <div className={styles.itemIcon}>{icon}</div>
      <span className={styles.itemText}>{text}</span>
    </li>
  );
}

const sectionGroups: {
  title: string;
  items: Array<{ key: Section; label: string; icon: React.ReactNode }>;
}[] = [
  {
    title: "Play",
    items: [
      { key: "find-players", label: "Find Players", icon: <Users /> },
      { key: "matches", label: "My Matches", icon: <Calendar /> },
      { key: "venues", label: "Book a Venue", icon: <MapPin /> },
    ],
  },
  {
    title: "Performance",
    items: [{ key: "rating", label: "Rating History", icon: <TrendingUp /> }],
  },
  {
    title: "Competition",
    items: [
      { key: "leaderboard", label: "Rankings", icon: <Trophy /> },
      { key: "tournaments", label: "Tournaments", icon: <Award /> },
    ],
  },
];

export default function Sidebar({
  section,
  setSection,
  user,
}: {
  section: Section;
  setSection: (s: Section) => void;
  user: any;
}) {
  return (
    <aside className={styles.aside}>
      <nav className={styles.nav}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Playbook</span>
        </div>

        <div className={styles.groups}>
          {sectionGroups.map((group) => (
            <section key={group.title} className={styles.group}>
              <h3 className={styles.sectionTitle}>{group.title}</h3>
              <ul className={styles.list}>
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.key}
                    icon={item.icon}
                    text={item.label}
                    active={section === item.key}
                    onClick={() => setSection(item.key)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className={styles.userRow}>
          <div className={styles.avatar} />

          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name || "User"}</div>
            <div className={styles.userEmail}>{user?.email || ""}</div>
          </div>

          <div className={styles.menuDesktop}>
            <MoreVertical size={18} />
          </div>

          <div className={styles.menuMobile}>
            <MoreVertical size={18} />
          </div>
        </div>
      </nav>
    </aside>
  );
}
