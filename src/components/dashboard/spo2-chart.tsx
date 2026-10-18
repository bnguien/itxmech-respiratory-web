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
import { getSpo2StatusLabel, spo2DataByRange, type Spo2ChartPoint } from "@/constants/spo2";
import { DEFAULT_SPO2_T } from "@/lib/wearable/presentation";

interface Spo2ChartProps {
  compact?: boolean;
  data?: Spo2ChartPoint[];
  /** Ngưỡng T bác sĩ đặt cho bệnh nhân (config.v1). */
  threshold?: number;
  /** Ngưỡng Critical của luật (crit_T). */
  criticalThreshold?: number;
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
  const abnormal = payload?.status === "warning";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={abnormal ? 4.5 : 2}
      fill={abnormal ? "#EF4444" : "#2F78C8"}
      stroke="#fff"
      strokeWidth={abnormal ? 2 : 1}
    />
  );
}

export function Spo2Chart({
  compact = false,
  data = spo2DataByRange["24h"],
  threshold = DEFAULT_SPO2_T,
  criticalThreshold,
}: Spo2ChartProps) {
  const lowest = Math.min(...data.map((point) => point.min ?? point.value));
  const floor = Math.max(70, Math.min(84, Math.floor((lowest - 2) / 2) * 2));
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
            minTickGap={24}
            dy={8}
          />
          <YAxis
            domain={[floor, 100]}
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
            formatter={(value, name) =>
              name === "min"
                ? [`${Number(value)}% · ${getSpo2StatusLabel(Number(value), threshold)}`, "Thấp nhất"]
                : [`${Number(value)}%`, "Trung bình"]
            }
            labelFormatter={(label) => `Thời gian: ${label}`}
          />
          {criticalThreshold !== undefined && (
            <ReferenceLine
              y={criticalThreshold}
              stroke="#B91C1C"
              strokeDasharray="2 4"
              strokeWidth={1.2}
              label={{
                value: `Nguy hiểm ${criticalThreshold}%`,
                fill: "#B91C1C",
                fontSize: 10,
                position: "insideBottomRight",
              }}
            />
          )}
          <ReferenceLine
            y={threshold}
            stroke="#EF4444"
            strokeDasharray="6 6"
            strokeWidth={1.5}
            label={{
              value: `Ngưỡng T ${threshold}%`,
              fill: "#EF4444",
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
          <Line
            type="monotone"
            dataKey="min"
            name="min"
            stroke="#9EC9F3"
            strokeWidth={1.2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="value"
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
