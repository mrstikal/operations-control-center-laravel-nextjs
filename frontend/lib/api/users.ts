import { get } from "./client";
import type { ListQuery } from "@/lib/types";

export type User = {
  id: number;
  name: string;
  email: string;
};

export function listUsers(query?: ListQuery) {
  return get<User[]>("/users", query);
}

export function getUserById(id: number | string) {
  return get<User>(`/users/${id}`);
}
