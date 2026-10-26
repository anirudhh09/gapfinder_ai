"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9", "#84cc16", "#f97316", "#64748b"];

export default function ProgressChart({
  data, topics,
}: { data: Record<string, number | string>[]; topics: string[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="attempt" />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip />
          <Legend />
          {topics.map((t, i) => (
            <Line key={t} type="monotone" dataKey={t} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot />
          ))}
          <Line type="monotone" dataKey="Overall" stroke="#0f172a" strokeWidth={3} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
