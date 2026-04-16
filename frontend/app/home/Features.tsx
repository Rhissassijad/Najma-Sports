"use client";

import { motion } from "framer-motion";
import { Trophy, BarChart3, Target } from "lucide-react";

const features = [
  {
    title: "Track Performance",
    description: "Monitor your progress with detailed stats and analytics.",
    icon: BarChart3,
  },
  {
    title: "Compete",
    description: "Challenge players and climb the global rankings.",
    icon: Trophy,
  },
  {
    title: "Improve",
    description: "Analyze your strengths and weaknesses to grow faster.",
    icon: Target,
  },
];

export default function Features() {
  return (
    <section className="py-24 px-6 bg-[#E5E7EB] text-center">
      
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold mb-16"
      >
        Why RyadaZone?
      </motion.h2>

      <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
        {features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-white p-8 rounded-2xl shadow hover:shadow-xl hover:-translate-y-1 transition duration-300"
            >
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-[#0055CC]/10">
                <Icon className="w-7 h-7 text-[#0055CC]" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}