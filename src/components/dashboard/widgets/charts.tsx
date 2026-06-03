"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

export interface ChartPoint {
  label: string;
  value: number;
}

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  background: "rgba(15, 23, 42, 0.92)", // slate-900
  color: "white",
  fontSize: 12,
  padding: "6px 10px",
  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
} as const;

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: "#94a3b8" }, // slate-400
} as const;

/** Smooth gradient area chart — appointments, patient growth, etc. */
export function AreaTrendChart({
  data,
  color = "#3b82f6",
  prefix = "",
  height = 200,
}: {
  data: ChartPoint[];
  color?: string;
  prefix?: string;
  height?: number;
}) {
  const id = `grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} width={40} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ stroke: color, strokeOpacity: 0.2 }}
          formatter={(v) => [`${prefix}${v}`, ""]}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Rounded bar chart — monthly revenue, doctor performance, etc. */
export function BarSeriesChart({
  data,
  color = "#10b981",
  prefix = "",
  height = 200,
  highlightMax = false,
}: {
  data: ChartPoint[];
  color?: string;
  prefix?: string;
  height?: number;
  highlightMax?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={0} minTickGap={0} />
        <YAxis {...axisProps} width={40} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: color, fillOpacity: 0.08 }}
          formatter={(v) => [`${prefix}${v}`, ""]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={highlightMax && d.value === max && max > 0 ? color : color} fillOpacity={highlightMax && d.value === max && max > 0 ? 1 : 0.55} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
