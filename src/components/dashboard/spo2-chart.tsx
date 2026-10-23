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
  chartTicks,
  pointLabel,
  spo2Axis,
  tickLabel,
  type Spo2ChartPoint,
  type WearableRange,
} from "@/lib/wearable/chart";
import { DEFAULT_SPO2_T } from "@/lib/wearable/presentation";

interface Spo2ChartProps {
  compact?: boolean;
  data: Spo2ChartPoint[];
  range: WearableRange;
  /** Ngưỡng T bác sĩ đặt cho bệnh nhân (config.v1). */
  threshold?: number;
  /** Ngưỡng Critical của luật (crit_T). */
  criticalThreshold?: number;
}

/**
 * Chấm đỏ ở nhóm có SpO₂ thấp nhất dưới T. Chấm cả điểm thường khi ít điểm (7 / 30 ngày) hoặc điểm đứng riêng
 * giữa hai khoảng trống (không có đoạn thẳng nào để thấy nó).
 */
function PointDot({ cx, cy, payload, show }: { cx?: number; cy?: number; payload?: Spo2ChartPoint; show: boolean }) {
  if (cx == null || cy == null || payload?.value == null) return <g />;
  const abnormal = payload.status === "warning";
  if (!abnormal && !show) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={abnormal ? 4 : 2.5}
      fill={abnormal ? "#EF4444" : "#2F78C8"}
      stroke="#fff"
      strokeWidth={abnormal ? 1.5 : 1}
    />
  );
}

/**
 * Biểu đồ SpO₂ theo thời gian thật: trục X là giờ (hoặc ngày) cách đều, đoạn không có số đo để trống
 * (mất kết nối, không đeo) chứ không nối thẳng qua. Đường gấp khúc nối đúng các điểm đo, không làm mượt.
 */
export function Spo2Chart({ compact = false, data, range, threshold = DEFAULT_SPO2_T, criticalThreshold }: Spo2ChartProps) {
  const start = data[0]?.t ?? 0;
  const end = data.at(-1)?.t ?? 0;
  const ticks = chartTicks(start, end, range);
  const axis = spo2Axis(data, [threshold, ...(criticalThreshold !== undefined ? [criticalThreshold] : [])]);
  const sparse = data.length <= 60;
  return (
    <div className={compact ? "h-64 w-full" : "h-[340px] w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 24, bottom: 12, left: 4 }}>
          <CartesianGrid stroke="#E6EEF7" strokeDasharray="3 4" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[start, end]}
            ticks={ticks}
            tickFormatter={(value: number) => tickLabel(value, range)}
            tick={{ fill: "#6E89A8", fontSize: 11 }}
            tickLine={{ stroke: "#D7E4F1" }}
            axisLine={{ stroke: "#D7E4F1" }}
            minTickGap={16}
            dy={6}
          />
          <YAxis
            domain={axis.domain}
            ticks={axis.ticks}
            interval={0}
            allowDataOverflow
            width={44}
            tick={{ fill: "#6E89A8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ stroke: "#9EC9F3", strokeDasharray: "3 3" }}
            labelStyle={{ color: "#173A5E", fontWeight: 700 }}
            contentStyle={{ border: "1px solid #D7E4F1", borderRadius: 12, boxShadow: "0 8px 24px rgba(23,58,94,.08)" }}
            labelFormatter={(label) => pointLabel(Number(label), range)}
            formatter={(value, name) => {
              if (value == null) return ["Không có số đo", name === "min" ? "Thấp nhất" : "SpO₂"];
              const v = Number(value);
              return name === "min"
                ? [`${v}%${v < threshold ? " · dưới ngưỡng T" : ""}`, "Thấp nhất"]
                : [`${v}%`, range === "6h" ? "SpO₂" : "Trung bình"];
            }}
          />
          {criticalThreshold !== undefined && (
            <ReferenceLine
              y={criticalThreshold}
              stroke="#B91C1C"
              strokeDasharray="2 4"
              strokeWidth={1.2}
              label={{ value: `Nguy hiểm ${criticalThreshold}%`, fill: "#B91C1C", fontSize: 10, position: "insideBottomRight" }}
            />
          )}
          <ReferenceLine
            y={threshold}
            stroke="#EF4444"
            strokeDasharray="6 6"
            strokeWidth={1.5}
            label={{ value: `Ngưỡng T ${threshold}%`, fill: "#EF4444", fontSize: 10, position: "insideTopRight" }}
          />
          {range !== "6h" && (
            <Line
              type="linear"
              dataKey="min"
              name="min"
              stroke="#9EC9F3"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line
            type="linear"
            dataKey="value"
            name="value"
            stroke="#2F78C8"
            strokeWidth={range === "6h" ? 1.6 : 2.2}
            dot={(props: { cx?: number; cy?: number; payload?: Spo2ChartPoint; index?: number }) => {
              const i = props.index ?? 0;
              const isolated = data[i - 1]?.value == null && data[i + 1]?.value == null;
              return <PointDot key={`dot-${i}`} cx={props.cx} cy={props.cy} payload={props.payload} show={sparse || isolated} />;
            }}
            activeDot={{ r: 5, fill: "#2F78C8", stroke: "#fff", strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
