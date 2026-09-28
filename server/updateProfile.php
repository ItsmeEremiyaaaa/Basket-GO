<?php
require __DIR__ . '/cors.php';
require_method('POST');
require __DIR__ . '/db.php';

$input = read_json_body();

$user_id = (int) ($input['user_id'] ?? 0);
if ($user_id <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'user_id is required']);
    exit;
}

$updates = [];
$params  = [];

if (array_key_exists('pickup_enabled', $input)) {
    $updates[] = 'pickup_enabled = ?';
    $params[]  = $input['pickup_enabled'] ? 1 : 0;
}
if (array_key_exists('same_day_enabled', $input)) {
    $updates[] = 'same_day_enabled = ?';
    $params[]  = $input['same_day_enabled'] ? 1 : 0;
}
if (array_key_exists('delivery_preference', $input)) {
    $pref = $input['delivery_preference'] === 'Delivery' ? 'Delivery' : 'Pickup';
    $updates[] = 'delivery_preference = ?';
    $params[]  = $pref;
}

if (empty($updates)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'No fields to update']);
    exit;
}

$params[] = $user_id;

$sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE user_id = ?';
$stmt = $pdo->prepare($sql);

try {
    $stmt->execute($params);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Update failed']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT user_id, user_name, email, contact_number, location, acc_type,
            loyalty_points, pickup_enabled, same_day_enabled, delivery_preference
     FROM users WHERE user_id = ? LIMIT 1'
);
$stmt->execute([$user_id]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Profile updated',
    'user' => [
        'id'                  => (int) $user['user_id'],
        'name'                => $user['user_name'],
        'email'               => $user['email'],
        'phone'               => $user['contact_number'],
        'address'             => $user['location'],
        'acc_type'            => $user['acc_type'],
        'loyalty_points'      => (int) $user['loyalty_points'],
        'pickup_enabled'      => (bool) $user['pickup_enabled'],
        'same_day_enabled'    => (bool) $user['same_day_enabled'],
        'delivery_preference' => $user['delivery_preference'],
    ],
]);
