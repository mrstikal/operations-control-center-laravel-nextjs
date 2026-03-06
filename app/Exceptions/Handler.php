<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e): void {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     *
     * For JSON requests every exception is mapped to a consistent envelope:
     *   { "success": false, "message": "...", "errors": {...} }
     */
    public function render($request, Throwable $exception): \Symfony\Component\HttpFoundation\Response
    {
        if ($this->isJsonRequest($request)) {
            return $this->renderJsonException($request, $exception);
        }

        return parent::render($request, $exception);
    }

    // -------------------------------------------------------------------------

    private function isJsonRequest(Request $request): bool
    {
        return $request->expectsJson() || $request->wantsJson();
    }

    private function renderJsonException(Request $request, Throwable $exception): JsonResponse
    {
        // 1. Unauthenticated
        if ($exception instanceof AuthenticationException) {
            return $this->jsonError('Unauthenticated.', 401);
        }

        // 2. Unauthorized (Gate / Policy)
        if ($exception instanceof AuthorizationException) {
            return $this->jsonError($exception->getMessage() ?: 'This action is unauthorized.', 403);
        }

        // 3. Model not found (Eloquent route-model binding)
        if ($exception instanceof ModelNotFoundException) {
            $model = class_basename($exception->getModel());

            return $this->jsonError("{$model} not found.", 404);
        }

        // 4. Validation
        if ($exception instanceof ValidationException) {
            return $this->jsonError(
                $exception->getMessage(),
                422,
                ['errors' => $exception->errors()]
            );
        }

        // 5. Generic HTTP exceptions (NotFoundHttpException, MethodNotAllowedHttpException …)
        if ($exception instanceof HttpException) {
            $status = $exception->getStatusCode();
            $message = $exception->getMessage() ?: $this->defaultHttpMessage($status);

            return $this->jsonError($message, $status);
        }

        // 6. Everything else – hide internals outside local/testing
        $debug = config('app.debug');
        $message = $debug ? $exception->getMessage() : 'Server Error.';
        $extra = $debug ? ['exception' => get_class($exception), 'trace' => collect($exception->getTrace())->take(10)->all()] : [];

        return $this->jsonError($message, 500, $extra);
    }

    /**
     * Build the canonical API error envelope.
     *
     * @param  array<string, mixed>  $extra
     */
    private function jsonError(string $message, int $status, array $extra = []): JsonResponse
    {
        return new JsonResponse(
            array_merge(['success' => false, 'message' => $message], $extra),
            $status
        );
    }

    private function defaultHttpMessage(int $status): string
    {
        return match ($status) {
            400 => 'Bad Request.',
            401 => 'Unauthenticated.',
            403 => 'Forbidden.',
            404 => 'Not Found.',
            405 => 'Method Not Allowed.',
            408 => 'Request Timeout.',
            409 => 'Conflict.',
            422 => 'Unprocessable Entity.',
            429 => 'Too Many Requests.',
            500 => 'Server Error.',
            503 => 'Service Unavailable.',
            default => "HTTP Error {$status}.",
        };
    }
}
