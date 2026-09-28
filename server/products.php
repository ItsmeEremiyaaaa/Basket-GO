<?php
require __DIR__ . '/cors.php';
require_method('GET');
require __DIR__ . '/db.php';

$stmt = $pdo->query(
    'SELECT product_id, name, category, price, origin, weight, rating, reviews, img_id
     FROM products
     ORDER BY product_id ASC'
);
$rows = $stmt->fetchAll();

$products = array_map(function ($r) {
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
}, $rows);

echo json_encode(['success' => true, 'products' => $products]);
