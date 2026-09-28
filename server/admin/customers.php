<?php
require __DIR__ . '/../cors.php';
require __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

function map_customer(array $r): array
{
    $joined = '';
    if (!empty($r['created_at'])) {
        $ts = strtotime($r['created_at']);
        if ($ts) $joined = date('j M, Y', $ts);
    }
    return [
        'id'      => (int) $r['user_id'],
        'name'    => $r['user_name'],
        'address' => $r['location'],
        'phone'   => $r['contact_number'],
        'orders'  => (int) ($r['order_count'] ?? 0),
        'joined'  => $joined,
        'status'  => $r['status'] ?: 'Active',
        'email'   => $r['email'],
        'street'  => $r['street'],
        'loyalty' => (int) ($r['loyalty_points'] ?? 0),
        'lat'     => $r['lat'] !== null ? (float) $r['lat'] : null,
        'lng'     => $r['lng'] !== null ? (float) $r['lng'] : null,
    ];
}

if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT u.user_id, u.user_name, u.email, u.contact_number, u.location, u.street,
                u.status, u.lat, u.lng, u.loyalty_points, u.created_at,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.user_id) AS order_count
         FROM users u
         WHERE u.acc_type != 'admin' OR u.acc_type IS NULL
         ORDER BY u.user_id DESC"
    );
    echo json_encode(['success' => true, 'customers' => array_map('map_customer', $stmt->fetchAll())]);
    exit;
}

if ($method === 'POST') {
    $input = read_json_body();
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'A name and valid email are required']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email is already registered']);
        exit;
    }

    $tempPassword = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        'INSERT INTO users (user_name, email, contact_number, location, street, status, lat, lng, loyalty_points, password, acc_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'customer\')'
    );
    try {
        $stmt->execute([
            $name,
            $email,
            $input['phone'] ?? '',
            $input['address'] ?? '',
            $input['street'] ?? '',
            ($input['status'] ?? 'Active') === 'Inactive' ? 'Inactive' : 'Active',
            isset($input['lat']) ? (float) $input['lat'] : null,
            isset($input['lng']) ? (float) $input['lng'] : null,
            (int) ($input['loyalty'] ?? 0),
            $tempPassword,
        ]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email is already registered']);
        exit;
    }
    $id = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        "SELECT user_id, user_name, email, contact_number, location, street, status, lat, lng, loyalty_points, created_at,
                0 AS order_count FROM users WHERE user_id = ?"
    );
    $stmt->execute([$id]);
    http_response_code(201);
    echo json_encode(['success' => true, 'customer' => map_customer($stmt->fetch())]);
    exit;
}

if ($method === 'PUT') {
    $input = read_json_body();
    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Customer id is required']);
        exit;
    }

    $columns = [
        'name'    => 'user_name',
        'email'   => 'email',
        'phone'   => 'contact_number',
        'address' => 'location',
        'street'  => 'street',
        'status'  => 'status',
        'lat'     => 'lat',
        'lng'     => 'lng',
        'loyalty' => 'loyalty_points',
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
    $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE user_id = ?');
    try {
        $stmt->execute($params);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'That email is already in use by another customer']);
        exit;
    }

    $stmt = $pdo->prepare(
        "SELECT u.user_id, u.user_name, u.email, u.contact_number, u.location, u.street,
                u.status, u.lat, u.lng, u.loyalty_points, u.created_at,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.user_id) AS order_count
         FROM users u WHERE u.user_id = ?"
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Customer not found']);
        exit;
    }
    echo json_encode(['success' => true, 'customer' => map_customer($row)]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Customer id is required']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT acc_type FROM users WHERE user_id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Customer not found']);
        exit;
    }
    if ($row['acc_type'] === 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Cannot delete an admin account']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM users WHERE user_id = ?');
    $stmt->execute([$id]);
    echo json_encode(['success' => true, 'message' => 'Customer deleted']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
