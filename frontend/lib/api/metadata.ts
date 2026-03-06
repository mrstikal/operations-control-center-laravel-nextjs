import { get } from "./client";

export interface HRMetadata {
  departments: string[];
  availability_statuses: Array<{ label: string; value: string }>;
  time_off_types: Array<{ label: string; value: string }>;
  time_off_statuses: Array<{ label: string; value: string }>;
}

export async function getHRMetadata() {
  return get<HRMetadata>("/metadata/hr");
}

export async function getDepartments() {
  return get<string[]>("/metadata/departments");
}

export async function getPositions() {
  return get<string[]>("/metadata/positions");
}
