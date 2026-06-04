"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

function useMounted() {
  const [m, setM] = React.useState(false);
  React.useEffect(() => setM(true), []);
  return m;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#64748b"];

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  background: "rgba(15, 23, 42, 0.92)",
  color: "white",
  fontSize: 12,
  padding: "6px 10px",
} as const;

/** Donut chart for the payment-method breakdown. */
export function MethodDonut({
  data,
  height = 220,
}: {
  data: { method: string; amount: number }[];
  height?: number;
}) {
  const mounted = useMounted();
  if (!mounted) {
    return <div style={{ height }} className="w-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-800/40" />;
  }
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">No payments yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="method"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => Number(v).toFixed(2)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
