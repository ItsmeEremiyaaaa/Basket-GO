<?php
// Shared CORS + preflight handling. Every endpoint does
// `require __DIR__ . '/cors.php';` before anything else.

ini_set('display_errors', 0);
error_reporting(E_ALL);

$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://basketgo.free.je',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Small helper every endpoint uses to read a JSON POST/PUT body.
function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
        exit;
    }
    return $input;
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }
}
