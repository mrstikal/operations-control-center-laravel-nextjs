export type UserRole = {
  id: number;
  name: string;
  level: number;
  description: string;
};

export type Permission = {
  id?: number;
  resource: string;
  action: string;
  name?: string;
  description?: string;
};

export type Me = {
  id: number;
  tenant_id: number;
  default_tenant_id?: number | null;
  name: string;
  email: string;
  tenant?: {
    id: number;
    name: string;
    deleted_at?: string | null;
  } | null;
  tenant_archived?: boolean;
  roles?: UserRole[];
  permissions?: Permission[];
  can_filter_by_tenant?: boolean;
};
