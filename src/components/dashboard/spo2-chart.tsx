"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  SPO2_WARNING_THRESHOLD,
  getSpo2StatusLabel,
  spo2DataByRange,
  type Spo2ChartPoint,
} from "@/constants/spo2";

interface Spo2ChartProps {
  compact?: boolean;
  data?: Spo2ChartPoint[];
}

function PointDot({
  cx = 0,
  cy = 0,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: Spo2ChartPoint;
}) {
  const abnormal = payload ? payload.value < SPO2_WARNING_THRESHOLD : false;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={abnormal ? 5 : 3.5}
      fill={abnormal ? "#EF4444" : "#2F78C8"}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

export function Spo2Chart({
  compact = false,
  data = spo2DataByRange["24h"],
}: Spo2ChartProps) {
  return (
    <div className={compact ? "h-64 w-full" : "h-[340px] w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 18, right: 24, bottom: 12, left: 4 }}
        >
          <CartesianGrid
            stroke="#E6EEF7"
            strokeDasharray="3 4"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "#6E89A8", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#D7E4F1" }}
            dy={8}
          />
          <YAxis
            domain={[85, 100]}
            ticks={[85, 90, 95, 100]}
            width={42}
            tick={{ fill: "#6E89A8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ stroke: "#9EC9F3", strokeDasharray: "3 3" }}
            labelStyle={{ color: "#173A5E", fontWeight: 700 }}
            contentStyle={{
              border: "1px solid #D7E4F1",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(23,58,94,.08)",
            }}
            formatter={(value) => [
              `${Number(value)}% · ${getSpo2StatusLabel(Number(value))}`,
              "SpO₂",
            ]}
            labelFormatter={(label) => `Thời gian: ${label}`}
          />
          <ReferenceLine
            y={SPO2_WARNING_THRESHOLD}
            stroke="#EF4444"
            strokeDasharray="6 6"
            strokeWidth={1.5}
            label={{
              value: `Ngưỡng ${SPO2_WARNING_THRESHOLD}%`,
              fill: "#EF4444",
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="SpO₂"
            stroke="#2F78C8"
            strokeWidth={2.5}
            dot={<PointDot />}
            activeDot={{
              r: 6,
              fill: "#2F78C8",
              stroke: "#fff",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
