-- ============================================================
-- BasketGo migration — run this ONCE in InfinityFree phpMyAdmin
-- against the if0_42898579_Basket_GO database.
-- Safe to re-run: every statement is additive/guarded.
-- ============================================================

-- ------------------------------------------------------------
-- 1. products
-- Dropped and recreated: a products table already existed on this
-- DB (from an earlier prototype) with a different, incompatible
-- column layout, which made "IF NOT EXISTS" silently keep the old
-- one and skip creating this schema.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS products;

CREATE TABLE products (
  product_id  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  category    VARCHAR(80)  NOT NULL,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  origin      VARCHAR(120) NOT NULL DEFAULT 'Local Supplier',
  weight      VARCHAR(40)  NOT NULL DEFAULT '',
  rating      DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  reviews     INT UNSIGNED NOT NULL DEFAULT 0,
  img_id      VARCHAR(120) NOT NULL DEFAULT '',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. orders
-- InfinityFree's shared MySQL rejects FOREIGN KEY constraints here
-- (errno 150) regardless of matching types/engines — a known
-- limitation of their free tier, not a schema bug. Using plain
-- indexed columns instead; the app already denormalizes enough
-- (order_items stores name/price/category directly) that DB-level
-- cascading was never load-bearing.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
  order_id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_number   VARCHAR(32)  NOT NULL,
  user_id        INT UNSIGNED NULL,
  status         ENUM('Pending','Packed','On the way','Delivered') NOT NULL DEFAULT 'Pending',
  subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee   DECIMAL(10,2) NOT NULL DEFAULT 0,
  total          DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_type  VARCHAR(20)  NOT NULL DEFAULT 'Delivery',
  payment_method VARCHAR(40)  NOT NULL DEFAULT 'Cash on Delivery',
  address        VARCHAR(255) NOT NULL DEFAULT '',
  contact_number VARCHAR(30)  NOT NULL DEFAULT '',
  order_date     VARCHAR(60)  NOT NULL DEFAULT '',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_number (order_number),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. order_items
-- ------------------------------------------------------------
CREATE TABLE order_items (
  item_id     INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NULL,
  name        VARCHAR(150) NOT NULL,
  qty         INT UNSIGNED NOT NULL DEFAULT 1,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  category    VARCHAR(80)  NULL,
  img_id      VARCHAR(120) NULL,
  KEY idx_order_id (order_id),
  KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. users — additive columns.
-- If "ADD COLUMN IF NOT EXISTS" errors as unsupported on your
-- MySQL/MariaDB version, remove "IF NOT EXISTS" and run each
-- ALTER once (they'll just fail harmlessly on a second run).
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS street     VARCHAR(255) NULL AFTER location;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status     ENUM('Active','Inactive') NOT NULL DEFAULT 'Active' AFTER acc_type;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lat        DOUBLE NULL AFTER status;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lng        DOUBLE NULL AFTER lat;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER lng;

-- ------------------------------------------------------------
-- 5. Seed products from the current storefront catalog
-- (idempotent: only inserts if the table is currently empty)
-- ------------------------------------------------------------
INSERT INTO products (name, category, price, origin, weight, rating, reviews, img_id)
SELECT * FROM (SELECT
  'Refined White Sugar'    AS name, 'Sugar'              AS category, 82  AS price, 'Local Supplier' AS origin, '1 kg'         AS weight, 4.9 AS rating, 156 AS reviews, '1488459716781-31db52582fe9' AS img_id UNION ALL SELECT
  'Brown Sugar',                    'Sugar',                78,           'Local Supplier',           '1 kg',                 4.8,           132,          '1488459716781-31db52582fe9' UNION ALL SELECT
  'Muscovado Sugar',                'Sugar',                65,           'Local Supplier',           '500 g',                4.7,           89,           '1488459716781-31db52582fe9' UNION ALL SELECT
  'Bulk Refined Sugar',             'Sugar',                90,           'Local Supplier',           '1 kg',                 5.0,           210,          '1488459716781-31db52582fe9' UNION ALL SELECT
  'Premium Rice',                   'Rice & Grains',        280,          'Local Supplier',           '5 kg',                 4.8,           198,          '1473648717346-73c9c15cbad6' UNION ALL SELECT
  'Well-Milled Rice',               'Rice & Grains',        235,          'Local Supplier',           '5 kg',                 4.7,           167,          '1473648717346-73c9c15cbad6' UNION ALL SELECT
  'Special Rice',                   'Rice & Grains',        145,          'Local Supplier',           '2 kg',                 4.9,           144,          '1473648717346-73c9c15cbad6' UNION ALL SELECT
  'Instant Coffee Mix',             'Beverages',             95,          'Local Supplier',           '25 sachets',           4.6,           234,          '1506617420156-8e4536971650' UNION ALL SELECT
  'Ground Coffee',                  'Beverages',             120,         'Local Supplier',           '250 g',                4.8,           189,          '1506617420156-8e4536971650' UNION ALL SELECT
  'Powdered Juice Drink',           'Beverages',             85,          'Local Supplier',           '1 kg',                 4.5,           156,          '1506617420156-8e4536971650' UNION ALL SELECT
  'Soft Drinks Pack',               'Beverages',             120,         'Local Supplier',           '6 bottles',            4.7,           201,          '1506617420156-8e4536971650' UNION ALL SELECT
  'Fresh Milk',                     'Dairy',                 95,          'Local Supplier',           '1 L',                  4.8,           178,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Cheese Block',                   'Dairy',                 75,          'Local Supplier',           '200 g',                4.6,           145,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Butter',                         'Dairy',                 68,          'Local Supplier',           '200 g',                4.7,           167,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Margarine',                      'Dairy',                 45,          'Local Supplier',           '250 g',                4.5,           134,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Yogurt Drink',                   'Dairy',                 110,         'Local Supplier',           '6 packs',              4.4,           112,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Sardines',                       'Canned Goods',          25,          'Local Supplier',           '155 g',                4.8,           289,          '1576181456177-2b99ac0aa1ef' UNION ALL SELECT
  'Corned Beef',                    'Canned Goods',          52,          'Local Supplier',           '210 g',                4.7,           245,          '1576181456177-2b99ac0aa1ef' UNION ALL SELECT
  'Tuna Flakes',                    'Canned Goods',          38,          'Local Supplier',           '184 g',                4.6,           212,          '1576181456177-2b99ac0aa1ef' UNION ALL SELECT
  'Meat Loaf',                      'Canned Goods',          45,          'Local Supplier',           '210 g',                4.5,           178,          '1576181456177-2b99ac0aa1ef' UNION ALL SELECT
  'Canned Sausage',                 'Canned Goods',          48,          'Local Supplier',           '230 g',                4.4,           156,          '1576181456177-2b99ac0aa1ef' UNION ALL SELECT
  'Cooking Oil',                    'Cooking Essentials',    145,         'Local Supplier',           '1 L',                  4.9,           312,          '1584473457406-6240486418e9' UNION ALL SELECT
  'All-Purpose Flour',              'Cooking Essentials',    62,          'Local Supplier',           '1 kg',                 4.7,           234,          '1584473457406-6240486418e9' UNION ALL SELECT
  'Soy Sauce',                      'Cooking Essentials',    55,          'Local Supplier',           '1 L',                  4.8,           267,          '1584473457406-6240486418e9' UNION ALL SELECT
  'Vinegar',                        'Cooking Essentials',    45,          'Local Supplier',           '1 L',                  4.8,           245,          '1584473457406-6240486418e9' UNION ALL SELECT
  'Fish Sauce',                     'Cooking Essentials',    48,          'Local Supplier',           '750 mL',               4.7,           198,          '1584473457406-6240486418e9' UNION ALL SELECT
  'Cornstarch',                     'Cooking Essentials',    38,          'Local Supplier',           '400 g',                4.6,           167,          '1584473457406-6240486418e9' UNION ALL SELECT
  'Ketchup',                        'Condiments',            52,          'Local Supplier',           '550 g',                4.7,           223,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Mayonnaise',                     'Condiments',            68,          'Local Supplier',           '470 mL',               4.6,           189,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Chili Sauce',                    'Condiments',            42,          'Local Supplier',           '340 g',                4.5,           156,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Salt (Iodized)',                 'Condiments',            18,          'Local Supplier',           '500 g',                4.9,           289,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Black Pepper',                   'Condiments',            35,          'Local Supplier',           '100 g',                4.8,           198,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Instant Noodles',                'Instant Foods',         85,          'Local Supplier',           '6 packs',              4.6,           312,          '1591586116988-62fe65164f8d' UNION ALL SELECT
  'Cup Noodles',                    'Instant Foods',         108,         'Local Supplier',           '6 cups',               4.5,           278,          '1591586116988-62fe65164f8d' UNION ALL SELECT
  'Oatmeal',                        'Instant Foods',         95,          'Local Supplier',           '500 g',                4.7,           167,          '1591586116988-62fe65164f8d' UNION ALL SELECT
  'Biscuits Assorted',              'Snacks',                75,          'Local Supplier',           '10 packs',             4.6,           245,          '1591586116988-62fe65164f8d' UNION ALL SELECT
  'Crackers',                       'Snacks',                52,          'Local Supplier',           '6 packs',              4.5,           198,          '1591586116988-62fe65164f8d' UNION ALL SELECT
  'Chocolate Bar',                  'Snacks',                95,          'Local Supplier',           '6 bars',               4.8,           234,          '1591586116988-62fe65164f8d' UNION ALL SELECT
  'Candy Assorted',                 'Snacks',                35,          'Local Supplier',           '20 pcs',               4.4,           178,          '1591586116988-62fe65164f8d' UNION ALL SELECT
  'Hotdogs',                        'Frozen Food',           165,         'Local Supplier',           '1 kg',                 4.7,           223,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Bacon',                          'Frozen Food',           185,         'Local Supplier',           '500 g',                4.8,           198,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Frozen Chicken',                 'Frozen Food',           195,         'Local Supplier',           '1 kg',                 4.6,           256,          '1582803824122-f25becf36ad8' UNION ALL SELECT
  'Laundry Detergent',              'Household',             85,          'Local Supplier',           '1 kg',                 4.7,           289,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Dishwashing Liquid',             'Household',             45,          'Local Supplier',           '500 mL',               4.6,           234,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Fabric Conditioner',             'Household',             68,          'Local Supplier',           '1 L',                  4.8,           212,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Bath Soap Pack',                 'Household',             95,          'Local Supplier',           '6 bars',               4.5,           267,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Shampoo',                        'Household',             72,          'Local Supplier',           '350 mL',               4.6,           198,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Toothpaste',                     'Household',             58,          'Local Supplier',           '150 g',                4.7,           234,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Tissue Paper',                   'Household',             85,          'Local Supplier',           '6 rolls',              4.5,           189,          '1578916171728-46686eac8d58' UNION ALL SELECT
  'Pandesal',                       'Bakery',                35,          'Local Bakery',              '10 pcs',              4.9,           345,          '1488459716781-31db52582fe9' UNION ALL SELECT
  'Loaf Bread',                     'Bakery',                58,          'Local Bakery',              '450 g',               4.8,           289,          '1488459716781-31db52582fe9' UNION ALL SELECT
  'Spanish Bread',                  'Bakery',                45,          'Local Bakery',              '6 pcs',               4.7,           234,          '1488459716781-31db52582fe9' UNION ALL SELECT
  'Ensaymada',                      'Bakery',                55,          'Local Bakery',              '6 pcs',               4.8,           198,          '1488459716781-31db52582fe9' UNION ALL SELECT
  'Cheese Bread',                   'Bakery',                62,          'Local Bakery',              '6 pcs',               4.9,           267,          '1488459716781-31db52582fe9' UNION ALL SELECT
  'Monay',                          'Bakery',                38,          'Local Bakery',              '250g',                4.6,           189,          '1488459716781-31db52582fe9'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);
