<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

function order_number(): string
{
    // Round to a clean integer first — base_convert() only understands
    // base-10 digit characters, and a raw float-to-string cast can inject
    // a decimal point that silently corrupts the conversion.
    $ms = (int) round(microtime(true) * 1000);
    $rand = random_int(0, 1295); // 2 extra base-36 chars of entropy against same-millisecond collisions
    return 'BG-' . strtoupper(base_convert((string) $ms, 10, 36)) . strtoupper(str_pad(base_convert((string) $rand, 10, 36), 2, '0', STR_PAD_LEFT));
}

function fetch_orders_by(PDO $pdo, string $where, array $params): array
{
    // Try the rider-aware query first; fall back if orders.rider_id / the
    // riders table don't exist yet (migration_riders.sql not run) so this
    // degrades gracefully instead of breaking order history entirely.
    try {
        $stmt = $pdo->prepare(
            "SELECT o.order_id, o.order_number, o.status, o.subtotal, o.delivery_fee, o.total,
                    o.delivery_type, o.payment_method, o.address, o.contact_number, o.order_date,
                    r.name AS rider_name, r.phone AS rider_phone,
                    r.vehicle_type AS rider_vehicle_type, r.vehicle_model AS rider_vehicle_model,
                    r.plate_number AS rider_plate
             FROM orders o
             LEFT JOIN riders r ON r.rider_id = o.rider_id
             WHERE $where
             ORDER BY o.order_id DESC"
        );
        $stmt->execute($params);
    } catch (PDOException $e) {
        $stmt = $pdo->prepare(
            "SELECT order_id, order_number, status, subtotal, delivery_fee, total,
                    delivery_type, payment_method, address, contact_number, order_date,
                    NULL AS rider_name, NULL AS rider_phone, NULL AS rider_vehicle_type,
                    NULL AS rider_vehicle_model, NULL AS rider_plate
             FROM orders
             WHERE $where
             ORDER BY order_id DESC"
        );
        $stmt->execute($params);
    }
    $orders = $stmt->fetchAll();
    if (!$orders) return [];

    $ids = array_column($orders, 'order_id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $itemStmt = $pdo->prepare(
        "SELECT order_id, product_id, name, qty, price, category, img_id
         FROM order_items WHERE order_id IN ($placeholders)"
    );
    $itemStmt->execute($ids);
    $itemsByOrder = [];
    foreach ($itemStmt->fetchAll() as $item) {
        $itemsByOrder[$item['order_id']][] = [
            'id'         => (int) ($item['product_id'] ?? 0),
            'product_id' => $item['product_id'] !== null ? (int) $item['product_id'] : null,
            'name'       => $item['name'],
            'qty'        => (int) $item['qty'],
            'price'      => (float) $item['price'],
            'category'   => $item['category'],
            'imgId'      => $item['img_id'],
        ];
    }

    return array_map(function ($o) use ($itemsByOrder) {
        return [
            'id'             => (int) $o['order_id'],
            'order_number'   => $o['order_number'],
            'status'         => $o['status'],
            'subtotal'       => (float) $o['subtotal'],
            'delivery_fee'   => (float) $o['delivery_fee'],
            'total'          => (float) $o['total'],
            'delivery_type'  => $o['delivery_type'],
            'payment_method' => $o['payment_method'],
            'address'        => $o['address'],
            'contact_number' => $o['contact_number'],
            'order_date'     => $o['order_date'],
            'items'          => $itemsByOrder[$o['order_id']] ?? [],
            'rider'          => $o['rider_name'] ? [
                'name'         => $o['rider_name'],
                'phone'        => $o['rider_phone'],
                'vehicleType'  => $o['rider_vehicle_type'],
                'vehicleModel' => $o['rider_vehicle_model'],
                'plateNumber'  => $o['rider_plate'],
            ] : null,
        ];
    }, $orders);
}

if ($method === 'GET') {
    if (isset($_GET['user_id']) && ctype_digit((string) $_GET['user_id'])) {
        $orders = fetch_orders_by($pdo, 'user_id = ?', [(int) $_GET['user_id']]);
    } elseif (isset($_GET['ids']) && trim((string) $_GET['ids']) !== '') {
        $ids = array_filter(array_map('trim', explode(',', (string) $_GET['ids'])), 'ctype_digit');
        $ids = array_slice(array_values($ids), 0, 50);
        if (!$ids) {
            echo json_encode(['success' => true, 'orders' => []]);
            exit;
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $orders = fetch_orders_by($pdo, "order_id IN ($placeholders)", $ids);
    } elseif (isset($_GET['order_number']) && trim((string) $_GET['order_number']) !== '') {
        $orders = fetch_orders_by($pdo, 'order_number = ?', [trim((string) $_GET['order_number'])]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Provide user_id, ids, or order_number']);
        exit;
    }

    echo json_encode(['success' => true, 'orders' => $orders]);
    exit;
}

if ($method === 'POST') {
    $input = read_json_body();

    $items = $input['items'] ?? [];
    if (!is_array($items) || count($items) === 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Order must include at least one item']);
        exit;
    }
    $address = trim($input['address'] ?? '');
    $contactNumber = trim($input['contactNumber'] ?? '');
    if ($address === '' || $contactNumber === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Address and contact number are required']);
        exit;
    }

    $userId = isset($input['user_id']) && $input['user_id'] !== null ? (int) $input['user_id'] : null;
    $subtotal = (float) ($input['subtotal'] ?? 0);
    $deliveryFee = (float) ($input['deliveryFee'] ?? 0);
    $total = (float) ($input['total'] ?? ($subtotal + $deliveryFee));
    $deliveryType = $input['deliveryType'] ?? 'Delivery';
    $paymentMethod = $input['paymentMethod'] ?? 'Cash on Delivery';
    $orderDate = $input['orderDate'] ?? date('F j, Y');
    $orderNumber = order_number();

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'INSERT INTO orders
                (order_number, user_id, status, subtotal, delivery_fee, total, delivery_type, payment_method, address, contact_number, order_date)
             VALUES (?, ?, \'Pending\', ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$orderNumber, $userId, $subtotal, $deliveryFee, $total, $deliveryType, $paymentMethod, $address, $contactNumber, $orderDate]);
        $orderId = (int) $pdo->lastInsertId();

        $itemStmt = $pdo->prepare(
            'INSERT INTO order_items (order_id, product_id, name, qty, price, category, img_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($items as $item) {
            $itemStmt->execute([
                $orderId,
                isset($item['id']) ? (int) $item['id'] : (isset($item['product_id']) ? (int) $item['product_id'] : null),
                $item['name'] ?? '',
                (int) ($item['qty'] ?? 1),
                (float) ($item['price'] ?? 0),
                $item['category'] ?? null,
                $item['imgId'] ?? null,
            ]);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to place order']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Order placed',
        'order' => [
            'id'             => $orderId,
            'order_number'   => $orderNumber,
            'status'         => 'Pending',
            'subtotal'       => $subtotal,
            'deliveryFee'    => $deliveryFee,
            'total'          => $total,
            'deliveryType'   => $deliveryType,
            'paymentMethod'  => $paymentMethod,
            'address'        => $address,
            'contactNumber'  => $contactNumber,
            'orderDate'      => $orderDate,
        ],
    ]);
    exit;
}

if ($method === 'PUT') {
    $input = read_json_body();
    $id = (int) ($input['id'] ?? 0);
    $status = $input['status'] ?? '';
    $allowed = ['Pending', 'Packed', 'On the way', 'Delivered'];
    if ($id <= 0 || !in_array($status, $allowed, true)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Valid id and status are required']);
        exit;
    }

    $riderId = isset($input['rider_id']) && $input['rider_id'] !== null ? (int) $input['rider_id'] : null;
    $stmt = null;
    if ($riderId !== null) {
        try {
            $stmt = $pdo->prepare('UPDATE orders SET status = ?, rider_id = ? WHERE order_id = ?');
            $stmt->execute([$status, $riderId, $id]);
        } catch (PDOException $e) {
            $stmt = null; // orders.rider_id doesn't exist yet (migration_riders.sql not run) — fall back below
        }
    }
    if ($stmt === null) {
        $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE order_id = ?');
        $stmt->execute([$status, $id]);
    }

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Order not found']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Order updated']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
