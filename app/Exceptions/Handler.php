<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
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
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render exception - API only mode
     */
    public function render($request, Throwable $exception)
    {
        // Always return JSON for API (avoid View service dependency)
        if ($request->expectsJson() || $request->wantsJson()) {
            $code = $exception->getCode() ?: 500;

            return new \Illuminate\Http\JsonResponse([
                'error' => true,
                'message' => $exception->getMessage(),
                'code' => $code,
            ], $code);
        }

        return parent::render($request, $exception);
    }
}



