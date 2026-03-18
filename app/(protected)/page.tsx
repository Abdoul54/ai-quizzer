"use client";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";

export default function Chat() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="grid gap-4">
          <ChartAreaInteractive />
        </div>
      </div>
    </div>
  );
}
