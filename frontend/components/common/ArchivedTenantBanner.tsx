type ArchivedTenantBannerProps = {
  tenantName: string;
};

export default function ArchivedTenantBanner({ tenantName }: ArchivedTenantBannerProps) {
  return (
    <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
      Tenant <strong>{tenantName}</strong> is archived, this page is read-only.
    </div>
  );
}
