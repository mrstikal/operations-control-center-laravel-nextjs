import { AVAILABILITY_STATUS_COLORS } from "@/lib/hr-constants";
import { getEmployeeStatus } from "@/lib/hr-normalizers";
import type { Employee } from "@/lib/types";

export default function EmployeeStatusBadge({ employee }: { employee: Employee }) {
  if (employee.deleted_at) {
    return (
      <span className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
        Deleted
      </span>
    );
  }

  const status = getEmployeeStatus(employee);
  const colorClass = AVAILABILITY_STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  const label = status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

  return <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${colorClass}`}>{label}</span>;
}

