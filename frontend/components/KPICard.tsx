"use client";

import { formatCurrency } from "@/lib/formatters/currency";
import { formatCompactNumber, formatPercentCompact } from "@/lib/formatters/number";
import { MaterialIcon, trendIconMap, type MaterialIconName } from "@/lib/icons";

interface KPICardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendPercent?: number;
  color?: "blue" | "green" | "red" | "orange" | "purple" | "cyan";
  isPercentage?: boolean;
  isCurrency?: boolean;
  icon?: MaterialIconName;
}

const textColorClasses = {
  blue: "text-blue-600",
  green: "text-green-600",
  red: "text-red-600",
  orange: "text-amber-600",
  purple: "text-purple-600",
  cyan: "text-cyan-600",
};

export default function KPICard({
  label,
  value,
  unit = "",
  trend,
  trendPercent = 0,
  color = "blue",
  isPercentage = false,
  isCurrency = false,
  icon,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    return trendIconMap[trend];
  };

  const getTrendColor = () => {
    if (!trend) return "text-gray-400";
    if (trend === "up") return "text-green-400";
    if (trend === "down") return "text-red-400";
    return "text-yellow-400";
  };

  const formatValue = (v: number | string) => {
    if (typeof v === "string") return v;

    if (isCurrency) {
      return formatCurrency(v);
    }

    if (isPercentage) {
      return formatPercentCompact(v);
    }

    return formatCompactNumber(v);
  };

  return (
    <div className="dashboard-card">
      <div className="flex justify-between items-start mb-4">
        <label className="dashboard-card-label">{label}</label>
        {icon && <MaterialIcon name={icon} className={`text-3xl! ${textColorClasses[color]}`} />}
      </div>

      <div className="leading-none">
        <div className={`text-3xl font-bold ${textColorClasses[color]}`}>
          {formatValue(value)}
          {unit && <span className={`text-lg ${textColorClasses[color]} ml-1`}>{unit}</span>}
        </div>
      </div>

      {trend && (
        <div className={`flex items-center gap-2 text-sm ${getTrendColor()}`}>
          <MaterialIcon name={getTrendIcon()!} className="text-base" />
          <span>
            {trend === "up" ? "Growth" : trend === "down" ? "Decline" : "Stable"}
            {trendPercent !== 0 && ` ${Math.abs(trendPercent)}%`}
          </span>
        </div>
      )}
    </div>
  );
}
