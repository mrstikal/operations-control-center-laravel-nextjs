export type ContractIncident = {
  id: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "closed";
  reported_at: string;
  resolved_at?: string | null;
  reported_by?: { id: number; name: string } | null;
  assigned_to?: { id: number; name: string } | null;
};

export type Contract = {
  id: number;
  tenant_id?: number;
  contract_number?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  tenant?: {
    id: number;
    name: string;
    deleted_at?: string | null;
  };
  client_id?: number;
  assigned_to?: number;
  budget?: number;
  spent?: number;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  incidents?: ContractIncident[];
  incidents_count?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
};
