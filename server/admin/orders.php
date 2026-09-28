<?php
require __DIR__ . '/../cors.php';
require_method('GET');
require __DIR__ . '/../db.php';

$totalOrders = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
$totalRevenue = (float) $pdo->query('SELECT COALESCE(SUM(total), 0) FROM orders')->fetchColumn();
$totalProducts = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
$totalCustomers = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE acc_type != 'admin' OR acc_type IS NULL")->fetchColumn();

// Try the rider-aware query first; fall back to the pre-rider-migration
// query if `orders.rider_id`/`riders` don't exist yet, so a not-yet-run
// migration_riders.sql degrades gracefully instead of breaking the whole
// Admin dashboard.
try {
    $stmt = $pdo->query(
        'SELECT o.order_id, o.order_number, o.status, o.total, o.order_date, o.contact_number, o.address,
                r.name AS rider_name,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) AS item_count,
                (SELECT oi.name FROM order_items oi WHERE oi.order_id = o.order_id ORDER BY oi.item_id ASC LIMIT 1) AS first_item_name,
                (SELECT oi.product_id FROM order_items oi WHERE oi.order_id = o.order_id ORDER BY oi.item_id ASC LIMIT 1) AS first_item_product_id
         FROM orders o
         LEFT JOIN riders r ON r.rider_id = o.rider_id
         ORDER BY o.order_id DESC
         LIMIT 200'
    );
} catch (PDOException $e) {
    $stmt = $pdo->query(
        'SELECT o.order_id, o.order_number, o.status, o.total, o.order_date, o.contact_number, o.address,
                NULL AS rider_name,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) AS item_count,
                (SELECT oi.name FROM order_items oi WHERE oi.order_id = o.order_id ORDER BY oi.item_id ASC LIMIT 1) AS first_item_name,
                (SELECT oi.product_id FROM order_items oi WHERE oi.order_id = o.order_id ORDER BY oi.item_id ASC LIMIT 1) AS first_item_product_id
         FROM orders o
         ORDER BY o.order_id DESC
         LIMIT 200'
    );
}

$orders = array_map(function ($r) {
    return [
        'id'          => $r['order_number'],
        'orderId'     => (int) $r['order_id'],
        'customer'    => $r['contact_number'] ?: ($r['address'] ?: 'Guest Customer'),
        'date'        => $r['order_date'],
        'status'      => $r['status'],
        'total'       => (float) $r['total'],
        'items'       => (int) $r['item_count'],
        'productName' => $r['first_item_name'] ?: 'Unknown Product',
        'productId'   => $r['first_item_product_id'] !== null ? (int) $r['first_item_product_id'] : 0,
        'riderName'   => $r['rider_name'],
    ];
}, $stmt->fetchAll());

echo json_encode([
    'success' => true,
    'stats' => [
        'totalOrders'     => $totalOrders,
        'totalRevenue'    => $totalRevenue,
        'totalProducts'   => $totalProducts,
        'totalCustomers'  => $totalCustomers,
    ],
    'orders' => $orders,
]);
