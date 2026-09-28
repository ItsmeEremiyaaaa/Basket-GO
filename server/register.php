<?php
require __DIR__ . '/cors.php';
require_method('POST');
require __DIR__ . '/db.php';

$input = read_json_body();

$name     = trim($input['name']    ?? '');
$email    = trim($input['email']   ?? '');
$phone    = trim($input['phone']   ?? '');
$street   = trim($input['street']  ?? '');
$address  = trim($input['address'] ?? '');
$password = $input['password']     ?? '';

$errors = [];
if ($name === '')                                                $errors[] = 'Name is required';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email is required';
if ($phone === '')                                               $errors[] = 'Phone is required';
if ($address === '')                                             $errors[] = 'Address is required';
if (strlen($password) < 6)                                       $errors[] = 'Password must be at least 6 characters';

if ($errors) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => implode('. ', $errors)]);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email is already registered']);
        exit;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO users (user_name, email, contact_number, location, street, password, acc_type, status)
     VALUES (?, ?, ?, ?, ?, ?, \'customer\', \'Active\')'
);

try {
    $stmt->execute([$name, $email, $phone, $address, $street, $hash]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create account']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Account created successfully',
    'id'      => (int) $pdo->lastInsertId(),
]);
