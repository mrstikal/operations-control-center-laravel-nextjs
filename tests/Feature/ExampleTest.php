<?php

use function Pest\Laravel\get;

test('the API debug endpoint returns a successful response', function () {
    $response = get('/api/_debug/auth');

    $response->assertStatus(200);
});
