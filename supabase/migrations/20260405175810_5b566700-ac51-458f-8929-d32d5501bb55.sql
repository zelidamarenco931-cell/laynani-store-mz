ALTER TABLE products ALTER COLUMN delivery_time_min SET DEFAULT 7;
ALTER TABLE products ALTER COLUMN delivery_time_max SET DEFAULT 20;
ALTER TABLE products ALTER COLUMN delivery_time SET DEFAULT '7-20 dias';