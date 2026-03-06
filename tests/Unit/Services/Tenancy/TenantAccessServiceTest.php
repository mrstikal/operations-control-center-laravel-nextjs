<?php

namespace Tests\Unit\Services\Tenancy;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Tests\TestCase;

class TenantAccessServiceTest extends TestCase
{
    use RefreshDatabase;

    protected TenantAccessService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(TenantAccessService::class);
    }

    public function test_non_admin_user_ignores_tenant_overrides(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);

        $user = User::factory()->create(['tenant_id' => $tenantA->id]);

        $request = Request::create('/api/contracts', 'GET', ['tenant_id' => $tenantB->id]);
        $request->headers->set('X-Tenant-Id', (string) $tenantB->id);

        $this->assertSame($tenantA->id, $this->service->resolveTenantId($user, $request));
    }

    public function test_admin_can_resolve_tenant_from_request_header_and_default(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);
        $tenantC = Tenant::create(['name' => 'Tenant C', 'status' => 'active']);

        $admin = User::factory()->create([
            'tenant_id' => $tenantA->id,
            'preferences' => ['default_tenant_id' => $tenantC->id],
        ]);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();

        $admin->roles()->attach($adminRole->id);

        $requestWithTenant = Request::create('/api/contracts', 'GET', ['tenant_id' => $tenantB->id]);
        $requestWithHeader = Request::create('/api/contracts', 'GET');
        $requestWithHeader->headers->set('X-Tenant-Id', (string) $tenantB->id);
        $requestWithDefault = Request::create('/api/contracts', 'GET');

        $this->assertSame($tenantB->id, $this->service->resolveTenantId($admin, $requestWithTenant));
        $this->assertSame($tenantB->id, $this->service->resolveTenantId($admin, $requestWithHeader));
        $this->assertSame($tenantC->id, $this->service->resolveTenantId($admin, $requestWithDefault));
    }

    public function test_admin_can_resolve_tenant_from_fallback_when_request_has_no_tenant_context(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);

        $admin = User::factory()->create(['tenant_id' => $tenantA->id]);
        $adminRole = Role::where('name', 'Admin')->firstOrFail();
        $admin->roles()->attach($adminRole->id);

        $request = Request::create('/api/contracts/1', 'PUT');

        $this->assertSame($tenantB->id, $this->service->resolveTenantId($admin, $request, $tenantB->id));
    }

    public function test_non_admin_user_ignores_fallback_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);

        $user = User::factory()->create(['tenant_id' => $tenantA->id]);
        $request = Request::create('/api/contracts/1', 'PUT');

        $this->assertSame($tenantA->id, $this->service->resolveTenantId($user, $request, $tenantB->id));
    }

    public function test_resolve_optional_tenant_allows_all_tenants_only_for_admin_filter_users(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);

        $regularUser = User::factory()->create(['tenant_id' => $tenant->id]);

        $adminUser = User::factory()->create(['tenant_id' => $tenant->id]);
        $adminRole = Role::where('name', 'Admin')->firstOrFail();
        $adminUser->roles()->attach($adminRole->id);

        $request = Request::create('/api/contracts', 'GET', ['all_tenants' => 'true']);

        $this->assertSame($tenant->id, $this->service->resolveOptionalTenantId($regularUser, $request));
        $this->assertNull($this->service->resolveOptionalTenantId($adminUser, $request));
    }

    public function test_user_can_access_tenant_rules_for_admin_and_non_admin(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);

        $regularUser = User::factory()->create(['tenant_id' => $tenantA->id]);
        $adminUser = User::factory()->create(['tenant_id' => $tenantA->id]);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();

        $adminUser->roles()->attach($adminRole->id);

        $this->assertTrue($this->service->userCanAccessTenant($regularUser, $tenantA->id));
        $this->assertFalse($this->service->userCanAccessTenant($regularUser, $tenantB->id));

        $this->assertTrue($this->service->userCanAccessTenant($adminUser, $tenantA->id));
        $this->assertTrue($this->service->userCanAccessTenant($adminUser, $tenantB->id));
        $this->assertFalse($this->service->userCanAccessTenant($adminUser, 0));
    }

    public function test_assert_writable_tenant_denies_all_tenants_flag_for_write_requests(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $admin = User::factory()->create(['tenant_id' => $tenant->id]);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();
        $admin->roles()->attach($adminRole->id);

        $request = Request::create('/api/contracts', 'POST', ['all_tenants' => 'true']);

        $this->expectException(AccessDeniedHttpException::class);
        $this->expectExceptionMessage('all_tenants is read-only');

        $this->service->assertWritableTenant($admin, $tenant->id, $request);
    }

    public function test_assert_tenant_access_throws_for_cross_tenant_non_admin(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);
        $user = User::factory()->create(['tenant_id' => $tenantA->id]);

        $this->expectException(AccessDeniedHttpException::class);
        $this->expectExceptionMessage('Tenant isolation violation');

        $this->service->assertTenantAccess($user, $tenantB->id);
    }

    public function test_resolve_tenant_id_throws_authentication_exception_for_null_user(): void
    {
        $this->expectException(AuthenticationException::class);
        $this->expectExceptionMessage('Tenant context requires an authenticated user.');

        $this->service->resolveTenantId(null, Request::create('/api/contracts', 'GET'));
    }

    public function test_resolve_optional_tenant_id_throws_authentication_exception_for_null_user(): void
    {
        $this->expectException(AuthenticationException::class);

        $this->service->resolveOptionalTenantId(null, Request::create('/api/contracts', 'GET'));
    }

    public function test_can_filter_by_tenant_returns_false_for_null_user(): void
    {
        $this->assertFalse($this->service->canFilterByTenant(null));
    }

    public function test_user_can_access_tenant_returns_false_for_null_user(): void
    {
        $this->assertFalse($this->service->userCanAccessTenant(null, 1));
    }
}
