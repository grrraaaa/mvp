"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export default function HomePage() {
  return (
    <SbbolAppLayout activeNav="moneyAndEvents">
      <DashboardHome />
    </SbbolAppLayout>
  );
}
