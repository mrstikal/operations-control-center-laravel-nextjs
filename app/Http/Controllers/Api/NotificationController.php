<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * NotificationController – Read, mark-read and list notifications for the
 * authenticated user. Non-admin users are scoped to their own notifications,
 * while Admin/Superadmin can view tenant-scoped notifications.
 */
class NotificationController extends BaseApiController
{
    /**
     * GET /api/notifications
     * List notifications visible to the current user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenantId = $this->getOptionalTenantId();

        $query = Notification::query()->orderBy('created_at', 'desc');

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->input('user_id'));
        }

        // Filters
        if ($request->filled('read')) {
            $query->where('read', filter_var($request->input('read'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        $perPage = (int) $request->input('per_page', 20);
        $notifications = $query->paginate($perPage);

        return $this->paginated($notifications, 'Notifications retrieved successfully');
    }

    /**
     * GET /api/notifications/{id}
     * Show a single notification.
     */
    public function show(int $id): JsonResponse
    {
        $notification = $this->findForCurrentUser($id);

        if (! $notification) {
            return $this->notFound('Notification not found');
        }

        return $this->success($notification, 'Notification retrieved successfully');
    }

    /**
     * POST /api/notifications/{id}/mark-read
     * Mark a single notification as read.
     */
    public function markRead(int $id): JsonResponse
    {
        $notification = $this->findForCurrentUser($id);

        if (! $notification) {
            return $this->notFound('Notification not found');
        }

        if (! $notification->isRead()) {
            $notification->markAsRead();
        }

        return $this->success($notification->fresh(), 'Notification marked as read');
    }

    /**
     * POST /api/notifications/mark-all-read
     * Mark all unread notifications of the current user as read.
     */
    public function markAllRead(): JsonResponse
    {
        $user = Auth::user();
        $tenantId = $this->getOptionalTenantId();

        $query = Notification::query()
            ->where('user_id', $user->id)
            ->where('read', false);

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        $count = $query->update([
            'read' => true,
            'read_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->success(
            ['updated_count' => $count],
            "Marked {$count} notifications as read"
        );
    }

    /**
     * GET /api/notifications/unread-count
     * Return the number of unread notifications for the current user.
     */
    public function unreadCount(): JsonResponse
    {
        $user = Auth::user();
        $tenantId = $this->getOptionalTenantId();

        $query = Notification::query()->where('read', false);

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        } elseif (request()->filled('user_id')) {
            $query->where('user_id', (int) request()->input('user_id'));
        }

        $count = $query->count();

        return $this->success(['count' => $count], 'Unread count retrieved');
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Find a notification visible to the current user in tenant scope.
     */
    private function findForCurrentUser(int $id): ?Notification
    {
        $user = Auth::user();
        $tenantId = $this->getOptionalTenantId();

        $query = Notification::where('id', $id);

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        return $query->first();
    }
}
