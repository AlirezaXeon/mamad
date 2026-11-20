-- Migration 0004: customer photos attached to orders (JSON array)
ALTER TABLE orders ADD COLUMN files TEXT DEFAULT '[]';
