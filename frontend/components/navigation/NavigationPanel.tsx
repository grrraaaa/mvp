"use client";

import { motion } from "framer-motion";
import type { NavigationStep } from "@/store/assistantStore";

interface NavigationPanelProps {
  steps: NavigationStep[];
}

export function NavigationPanel({ steps }: NavigationPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 bg-gray-900/90 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-sm"
    >
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray-500">›</span>}
          <a
            href={step.url}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {step.label}
          </a>
        </span>
      ))}
    </motion.div>
  );
}
