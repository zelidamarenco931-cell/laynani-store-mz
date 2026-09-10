-- Netshop Integration Migration
-- Add netshop_payment_id column to orders table

BEGIN;

-- Add netshop_payment_id column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS netshop_payment_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_netshop_payment_id 
ON orders(netshop_payment_id);

-- Add comment
COMMENT ON COLUMN orders.netshop_payment_id IS 'Netshop payment ID for tracking automatic payments';

COMMIT;
