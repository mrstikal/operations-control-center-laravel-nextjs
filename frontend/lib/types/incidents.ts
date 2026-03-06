export type Incident = {
  id: number;
  tenant_id?: number;
  incident_number?: string;
  title: string;
  description?: string;
  category?: string;
  severity?: string;
  priority?: string;
  status: string;
  tenant?: {
    id: number;
    name: string;
    deleted_at?: string | null;
  };
  reported_by?: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: number;
    name: string;
  };
  reported_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
};
