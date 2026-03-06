import { describe, expect, it } from "vitest";
import {
  getEmployeeDepartmentName,
  getEmployeeDisplayEmail,
  getEmployeeDisplayName,
  getEmployeeDisplayPhone,
  getEmployeeStatus,
  getRequestEmployeeDepartment,
  getRequestEmployeeEmail,
  getRequestEmployeeName,
  getRequestEmployeePosition,
  getShiftEndDate,
  getShiftName,
  getShiftStartDate,
  getShiftTimeRange,
  getTimeOffDateRange,
  getTimeOffEnd,
  getTimeOffStart,
  getTimeOffStatus,
  getTimeOffType,
  getWorkloadActual,
  getWorkloadAllocated,
  getWorkloadUtilization,
} from "@/lib/hr-normalizers";
import type { Employee } from "@/lib/types";

const baseEmployee: Employee = {
  id: 1,
  user: { name: "Alice Smith", email: "alice@example.com", phone: "123456789", bio: null },
  name: "Fallback Name",
  email: "fallback@example.com",
  phone: "000000000",
};

describe("Employee display helpers", () => {
  it("prefers user.name over employee.name", () => {
    expect(getEmployeeDisplayName(baseEmployee)).toBe("Alice Smith");
  });

  it("falls back to employee.name when user is absent", () => {
    expect(getEmployeeDisplayName({ id: 2, name: "Bob" })).toBe("Bob");
  });

  it("returns - when no name is available", () => {
    expect(getEmployeeDisplayName({ id: 3 })).toBe("-");
  });

  it("prefers user.email over employee.email", () => {
    expect(getEmployeeDisplayEmail(baseEmployee)).toBe("alice@example.com");
  });

  it("prefers user.phone over employee.phone", () => {
    expect(getEmployeeDisplayPhone(baseEmployee)).toBe("123456789");
  });

  it("returns availability_status or unavailable as fallback", () => {
    expect(getEmployeeStatus({ id: 1, availability_status: "available" })).toBe("available");
    expect(getEmployeeStatus({ id: 1 })).toBe("unavailable");
  });
});

describe("getEmployeeDepartmentName", () => {
  it("handles department as a string", () => {
    expect(getEmployeeDepartmentName({ id: 1, department: "IT" })).toBe("IT");
  });

  it("handles department as an object with name", () => {
    expect(getEmployeeDepartmentName({ id: 1, department: { id: 5, name: "HR" } })).toBe("HR");
  });

  it("returns - when department is missing", () => {
    expect(getEmployeeDepartmentName({ id: 1 })).toBe("-");
  });
});

describe("Shift helpers", () => {
  const shiftItem = {
    shift: { name: "Morning Shift", start_time: "08:00", end_time: "16:00" },
    start_date: "2024-03-09",
    end_date: "2024-03-15",
  };

  it("returns shift name", () => {
    expect(getShiftName(shiftItem)).toBe("Morning Shift");
    expect(getShiftName({})).toBe("Assigned shift");
  });

  it("returns formatted time range", () => {
    expect(getShiftTimeRange(shiftItem)).toBe("08:00 – 16:00");
    expect(getShiftTimeRange({})).toBe("--:-- – --:--");
  });

  it("returns formatted start and end dates", () => {
    expect(getShiftStartDate(shiftItem)).not.toBe("-");
    expect(getShiftEndDate(shiftItem)).not.toBe("–");
    expect(getShiftEndDate({ end_date: null })).toBe("–");
  });
});

describe("Time-off helpers", () => {
  const request = {
    type: "annual_leave",
    status: "approved",
    start_date: "2024-03-01",
    end_date: "2024-03-05",
  };

  it("returns uppercase time-off type", () => {
    expect(getTimeOffType(request)).toBe("ANNUAL LEAVE");
    expect(getTimeOffType({})).toBe("OTHER");
  });

  it("returns status or pending fallback", () => {
    expect(getTimeOffStatus(request)).toBe("approved");
    expect(getTimeOffStatus({})).toBe("pending");
  });

  it("returns formatted start and end dates", () => {
    expect(getTimeOffStart(request)).not.toBe("-");
    expect(getTimeOffEnd(request)).not.toBe("-");
  });

  it("returns a date range string", () => {
    expect(getTimeOffDateRange(request)).not.toBe("-");
  });
});

describe("Workload helpers", () => {
  const entry = {
    work_date: "2024-03-10",
    hours_allocated: 8,
    hours_actual: 7,
    capacity_utilization: 87.5,
  };

  it("returns allocated and actual hours", () => {
    expect(getWorkloadAllocated(entry)).toBe(8);
    expect(getWorkloadActual(entry)).toBe(7);
  });

  it("returns - for missing hours_actual", () => {
    expect(getWorkloadActual({})).toBe("-");
  });

  it("returns utilization percentage", () => {
    expect(getWorkloadUtilization(entry)).toBe(87.5);
    expect(getWorkloadUtilization({})).toBe(0);
  });
});

describe("Request employee helpers", () => {
  const row: {
    employee: {
      user: { name?: string; email?: string };
      department?: string;
      position?: string;
    };
    employee_name?: string;
    employee_email?: string;
    employee_department?: string;
    employee_position?: string;
  } = {
    employee: { user: { name: "Carol" }, department: "Ops", position: "Lead" },
    employee_email: "carol@example.com",
  };

  it("returns employee name from nested user", () => {
    expect(getRequestEmployeeName(row)).toBe("Carol");
  });

  it("falls back to top-level fields", () => {
    expect(getRequestEmployeeEmail(row)).toBe("carol@example.com");
    expect(getRequestEmployeeDepartment(row)).toBe("Ops");
    expect(getRequestEmployeePosition(row)).toBe("Lead");
  });

  it("returns - when all fields are missing", () => {
    expect(getRequestEmployeeName({ employee: {} })).toBe("-");
  });
});
