-- ============================================================
-- BasketGo rider-roster migration — run this ONCE in phpMyAdmin
-- against the if0_42898579_Basket_GO database.
-- Safe to re-run.
-- ============================================================

-- A `riders` table already existed on this DB (different, incompatible
-- schema — no `name` column), which made "IF NOT EXISTS" silently keep
-- the old one and skip creating this schema. Same issue as `products`
-- in migration.sql — drop and recreate.
DROP TABLE IF EXISTS riders;

CREATE TABLE riders (
  rider_id      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  phone         VARCHAR(30)  NOT NULL DEFAULT '',
  vehicle_type  VARCHAR(60)  NOT NULL DEFAULT 'Motorcycle',
  vehicle_model VARCHAR(120) NOT NULL DEFAULT '',
  plate_number  VARCHAR(30)  NOT NULL DEFAULT '',
  status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which rider most recently touched an order (picked up / delivered).
-- No FOREIGN KEY — InfinityFree's shared MySQL rejects them (see
-- migration.sql's note on the same issue with orders/order_items).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id INT UNSIGNED NULL AFTER user_id;
