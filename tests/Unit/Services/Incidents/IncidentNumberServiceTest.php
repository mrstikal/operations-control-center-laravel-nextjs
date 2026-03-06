<?php

namespace Tests\Unit\Services\Incidents;

use App\Services\Incidents\IncidentNumberService;
use Illuminate\Database\QueryException;
use PHPUnit\Framework\TestCase;

/**
 * Unit testy pro IncidentNumberService.
 *
 * Testy jsou izolované (bez DB), protože service nepotřebuje Eloquent.
 */
class IncidentNumberServiceTest extends TestCase
{
    private IncidentNumberService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new IncidentNumberService;
    }

    // -------------------------------------------------------------------------
    // nextIncidentNumber
    // -------------------------------------------------------------------------

    public function test_generates_first_number_when_no_previous_exists(): void
    {
        $this->assertSame('INC-000001', $this->service->nextIncidentNumber(null));
    }

    public function test_generates_first_number_for_empty_string(): void
    {
        $this->assertSame('INC-000001', $this->service->nextIncidentNumber(''));
    }

    public function test_increments_existing_number_correctly(): void
    {
        $this->assertSame('INC-000002', $this->service->nextIncidentNumber('INC-000001'));
        $this->assertSame('INC-000010', $this->service->nextIncidentNumber('INC-000009'));
        $this->assertSame('INC-000100', $this->service->nextIncidentNumber('INC-000099'));
    }

    public function test_pads_number_to_six_digits(): void
    {
        $result = $this->service->nextIncidentNumber('INC-000001');

        $this->assertSame(10, strlen($result)); // "INC-" + 6 digits
        $this->assertMatchesRegularExpression('/^INC-\d{6}$/', $result);
    }

    public function test_handles_large_sequence_numbers(): void
    {
        $this->assertSame('INC-100001', $this->service->nextIncidentNumber('INC-100000'));
        $this->assertSame('INC-999999', $this->service->nextIncidentNumber('INC-999998'));
    }

    public function test_generates_first_number_for_non_matching_format(): void
    {
        // String, který neodpovídá vzoru INC-XXXXXX, se chová jako null
        $this->assertSame('INC-000001', $this->service->nextIncidentNumber('INVALID-FORMAT'));
        $this->assertSame('INC-000001', $this->service->nextIncidentNumber('INC-abc'));
        $this->assertSame('INC-000001', $this->service->nextIncidentNumber('000001'));
    }

    // -------------------------------------------------------------------------
    // isIncidentNumberCollision
    // -------------------------------------------------------------------------

    /**
     * Vytvoří mock QueryException s danou zprávou.
     */
    private function makeQueryException(string $message): QueryException
    {
        return new QueryException('sqlite', 'INSERT INTO incidents', [], new \Exception($message));
    }

    public function test_detects_sqlite_unique_constraint_collision(): void
    {
        $exception = $this->makeQueryException(
            'SQLSTATE[23000]: Integrity constraint violation: 19 UNIQUE constraint failed: incidents.incident_number'
        );

        $this->assertTrue($this->service->isIncidentNumberCollision($exception));
    }

    public function test_detects_mysql_duplicate_entry_collision(): void
    {
        $exception = $this->makeQueryException(
            "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'INC-000001' for key 'incidents.incident_number'"
        );

        $this->assertTrue($this->service->isIncidentNumberCollision($exception));
    }

    public function test_detects_generic_unique_violation(): void
    {
        $exception = $this->makeQueryException(
            'ERROR: duplicate key value violates unique constraint "incidents_incident_number_unique" (incident_number)'
        );

        $this->assertTrue($this->service->isIncidentNumberCollision($exception));
    }

    public function test_returns_false_for_unrelated_constraint_violation(): void
    {
        // Jiný sloupec – ne incident_number
        $exception = $this->makeQueryException(
            'SQLSTATE[23000]: UNIQUE constraint failed: incidents.contract_id'
        );

        $this->assertFalse($this->service->isIncidentNumberCollision($exception));
    }

    public function test_returns_false_for_foreign_key_violation(): void
    {
        $exception = $this->makeQueryException(
            'SQLSTATE[23000]: Integrity constraint violation: 1452 Cannot add or update a child row: a foreign key constraint fails'
        );

        $this->assertFalse($this->service->isIncidentNumberCollision($exception));
    }

    public function test_returns_false_for_unrelated_error(): void
    {
        $exception = $this->makeQueryException('SQLSTATE[42S02]: Base table or view not found: 1146 Table \'incidents\' doesn\'t exist');

        $this->assertFalse($this->service->isIncidentNumberCollision($exception));
    }
}
