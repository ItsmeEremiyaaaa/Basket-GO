<?php
// Shared PDO connection. Every endpoint does `require __DIR__ . '/db.php';`
// and gets a ready $pdo. Keep the real credentials here ONLY — server/.htaccess
// blocks this file from being requested directly over HTTP.

$DB_HOST = 'sql305.infinityfree.com';
$DB_NAME = 'if0_42898579_Basket_GO';
$DB_USER = 'if0_42898579';
$DB_PASS = '79FQ8bJTXX9k';

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}
