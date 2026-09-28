<?php
require __DIR__ . '/../cors.php';
require __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

function map_product(array $r): array
{
    return [
        'id'       => (int) $r['product_id'],
        'name'     => $r['name'],
        'category' => $r['category'],
        'price'    => (float) $r['price'],
        'origin'   => $r['origin'],
        'weight'   => $r['weight'],
        'rating'   => (float) $r['rating'],
        'reviews'  => (int) $r['reviews'],
        'imgId'    => $r['img_id'],
    ];
}

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT product_id, name, category, price, origin, weight, rating, reviews, img_id
         FROM products ORDER BY product_id ASC'
    );
    echo json_encode(['success' => true, 'products' => array_map('map_product', $stmt->fetchAll())]);
    exit;
}

if ($method === 'POST') {
    $input = read_json_body();
    $name = trim($input['name'] ?? '');
    if ($name === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Product name is required']);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO products (name, category, price, origin, weight, rating, reviews, img_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $name,
        $input['category'] ?? 'Sugar',
        (float) ($input['price'] ?? 0),
        $input['origin'] ?? 'Local Supplier',
        $input['weight'] ?? '1 kg',
        (float) ($input['rating'] ?? 5.0),
        (int) ($input['reviews'] ?? 0),
        $input['imgId'] ?? '',
    ]);
    $id = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare('SELECT product_id, name, category, price, origin, weight, rating, reviews, img_id FROM products WHERE product_id = ?');
    $stmt->execute([$id]);
    http_response_code(201);
    echo json_encode(['success' => true, 'product' => map_product($stmt->fetch())]);
    exit;
}

if ($method === 'PUT') {
    $input = read_json_body();
    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Product id is required']);
        exit;
    }

    $fields = ['name', 'category', 'price', 'origin', 'weight', 'rating', 'reviews', 'imgId'];
    $columns = ['name' => 'name', 'category' => 'category', 'price' => 'price', 'origin' => 'origin', 'weight' => 'weight', 'rating' => 'rating', 'reviews' => 'reviews', 'imgId' => 'img_id'];
    $updates = [];
    $params = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $input)) {
            $updates[] = $columns[$f] . ' = ?';
            $params[] = $input[$f];
        }
    }
    if (!$updates) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit;
    }
    $params[] = $id;
    $stmt = $pdo->prepare('UPDATE products SET ' . implode(', ', $updates) . ' WHERE product_id = ?');
    $stmt->execute($params);

    $stmt = $pdo->prepare('SELECT product_id, name, category, price, origin, weight, rating, reviews, img_id FROM products WHERE product_id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        exit;
    }
    echo json_encode(['success' => true, 'product' => map_product($row)]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Product id is required']);
        exit;
    }
    $stmt = $pdo->prepare('DELETE FROM products WHERE product_id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        exit;
    }
    echo json_encode(['success' => true, 'message' => 'Product deleted']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
