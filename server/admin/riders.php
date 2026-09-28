<?php
require __DIR__ . '/../cors.php';
require __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

function map_rider(array $r): array
{
    return [
        'id'           => (int) $r['rider_id'],
        'name'         => $r['name'],
        'phone'        => $r['phone'],
        'vehicleType'  => $r['vehicle_type'],
        'vehicleModel' => $r['vehicle_model'],
        'plateNumber'  => $r['plate_number'],
        'status'       => $r['status'] ?: 'Active',
        'deliveries'   => (int) ($r['delivery_count'] ?? 0),
    ];
}

function riders_table_missing_message(PDOException $e): string
{
    // SQLSTATE 42S02 = "Base table or view not found" — almost certainly
    // means migration_riders.sql hasn't been run yet on this database.
    if ($e->getCode() === '42S02' || str_contains($e->getMessage(), "doesn't exist")) {
        return "The riders table doesn't exist yet — run server/migration_riders.sql in phpMyAdmin first.";
    }
    return 'Database error. Please try again.';
}

if ($method === 'GET') {
    try {
        $stmt = $pdo->query(
            "SELECT r.rider_id, r.name, r.phone, r.vehicle_type, r.vehicle_model, r.plate_number, r.status,
                    (SELECT COUNT(*) FROM orders o WHERE o.rider_id = r.rider_id AND o.status = 'Delivered') AS delivery_count
             FROM riders r
             ORDER BY r.rider_id ASC"
        );
        echo json_encode(['success' => true, 'riders' => array_map('map_rider', $stmt->fetchAll())]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => riders_table_missing_message($e)]);
    }
    exit;
}

if ($method === 'POST') {
    $input = read_json_body();
    $name = trim($input['name'] ?? '');
    if ($name === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Rider name is required']);
        exit;
    }

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO riders (name, phone, vehicle_type, vehicle_model, plate_number, status)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $name,
            $input['phone'] ?? '',
            $input['vehicleType'] ?? 'Motorcycle',
            $input['vehicleModel'] ?? '',
            $input['plateNumber'] ?? '',
            ($input['status'] ?? 'Active') === 'Inactive' ? 'Inactive' : 'Active',
        ]);
        $id = (int) $pdo->lastInsertId();

        $stmt = $pdo->prepare(
            'SELECT rider_id, name, phone, vehicle_type, vehicle_model, plate_number, status, 0 AS delivery_count
             FROM riders WHERE rider_id = ?'
        );
        $stmt->execute([$id]);
        http_response_code(201);
        echo json_encode(['success' => true, 'rider' => map_rider($stmt->fetch())]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => riders_table_missing_message($e)]);
    }
    exit;
}

if ($method === 'PUT') {
    $input = read_json_body();
    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Rider id is required']);
        exit;
    }

    $columns = [
        'name'         => 'name',
        'phone'        => 'phone',
        'vehicleType'  => 'vehicle_type',
        'vehicleModel' => 'vehicle_model',
        'plateNumber'  => 'plate_number',
        'status'       => 'status',
    ];
    $updates = [];
    $params = [];
    foreach ($columns as $field => $column) {
        if (array_key_exists($field, $input)) {
            $updates[] = "$column = ?";
            $params[] = $input[$field];
        }
    }
    if (!$updates) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit;
    }
    $params[] = $id;
    try {
        $stmt = $pdo->prepare('UPDATE riders SET ' . implode(', ', $updates) . ' WHERE rider_id = ?');
        $stmt->execute($params);

        $stmt = $pdo->prepare(
            "SELECT r.rider_id, r.name, r.phone, r.vehicle_type, r.vehicle_model, r.plate_number, r.status,
                    (SELECT COUNT(*) FROM orders o WHERE o.rider_id = r.rider_id AND o.status = 'Delivered') AS delivery_count
             FROM riders r WHERE r.rider_id = ?"
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Rider not found']);
            exit;
        }
        echo json_encode(['success' => true, 'rider' => map_rider($row)]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => riders_table_missing_message($e)]);
    }
    exit;
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Rider id is required']);
        exit;
    }
    try {
        $stmt = $pdo->prepare('DELETE FROM riders WHERE rider_id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Rider not found']);
            exit;
        }
        echo json_encode(['success' => true, 'message' => 'Rider deleted']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => riders_table_missing_message($e)]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
