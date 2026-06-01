"use client";

<<<<<<< HEAD
import type { NavigationStep } from "@/store/assistantStore";

interface Props {
  steps: NavigationStep[];
}

export function NavigationPanel({ steps }: Props) {
  return (
    <div className="flex items-center gap-1.5 sber-panel px-4 py-2 rounded-full border text-sm">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-sber-green/50">→</span>}
          <span
            className={
              i === steps.length - 1
                ? "text-sber-green-light font-medium"
                : "text-sber-muted"
            }
          >
            {step.label}
          </span>
        </span>
      ))}
    </div>
=======
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
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
  );
}
