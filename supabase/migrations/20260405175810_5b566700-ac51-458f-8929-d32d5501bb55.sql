ALTER TABLE products ALTER COLUMN delivery_time_min SET DEFAULT 3;
ALTER TABLE products ALTER COLUMN delivery_time_max SET DEFAULT 7;
ALTER TABLE products ALTER COLUMN delivery_time SET DEFAULT '3-7 dias';