<?php
require __DIR__ . '/cors.php';
require_method('POST');
require __DIR__ . '/db.php';

$input = read_json_body();

$email    = trim($input['email']    ?? '');
$password = $input['password']      ?? '';

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Valid email is required']);
    exit;
}
if ($password === '') {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Password is required']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT user_id, user_name, email, contact_number, location, password, acc_type
     FROM users
     WHERE email = ?
     LIMIT 1'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Login successful',
    'user' => [
        'id'       => (int) $user['user_id'],
        'name'     => $user['user_name'],
        'email'    => $user['email'],
        'phone'    => $user['contact_number'],
        'address'  => $user['location'],
        'acc_type' => $user['acc_type'],
    ],
]);
