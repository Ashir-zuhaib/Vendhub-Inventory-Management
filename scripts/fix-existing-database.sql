-- Fix Existing Database Schema
-- Run this script in your Supabase SQL editor to fix existing tables

-- Check current table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('locations', 'products', 'inventory', 'sales')
ORDER BY table_name, ordinal_position;

-- Drop existing tables if they have wrong structure
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- Recreate tables with correct structure
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scancode TEXT UNIQUE NOT NULL,
  upc TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  starting_quantity INTEGER NOT NULL DEFAULT 0,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL,
  raw_csv_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_inventory_location_product ON inventory(location_id, product_id);
CREATE INDEX idx_sales_location_product ON sales(location_id, product_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_products_scancode ON products(scancode);
CREATE INDEX idx_products_upc ON products(upc);

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read locations" ON locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert locations" ON locations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read products" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert products" ON products
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read inventory" ON inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert inventory" ON inventory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update inventory" ON inventory
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read sales" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create views
CREATE OR REPLACE VIEW inventory_with_products AS
SELECT 
  i.id,
  i.location_id,
  i.product_id,
  i.starting_quantity,
  i.current_quantity,
  i.last_updated,
  p.name as product_name,
  p.scancode,
  p.upc,
  l.name as location_name,
  l.vendor
FROM inventory i
LEFT JOIN products p ON i.product_id = p.scancode
LEFT JOIN locations l ON i.location_id = l.id;

CREATE OR REPLACE VIEW sales_with_details AS
SELECT 
  s.id,
  s.location_id,
  s.product_id,
  s.quantity_sold,
  s.sale_date,
  s.price,
  s.total,
  s.source,
  s.raw_csv_hash,
  s.created_at,
  p.name as product_name,
  p.scancode,
  p.upc,
  l.name as location_name,
  l.vendor
FROM sales s
LEFT JOIN products p ON s.product_id = p.scancode
LEFT JOIN locations l ON s.location_id = l.id;

-- Create functions
CREATE OR REPLACE FUNCTION update_inventory_from_sale(
  p_location_id TEXT,
  p_product_id TEXT,
  p_quantity_sold INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Update existing inventory
  UPDATE inventory 
  SET 
    current_quantity = GREATEST(0, current_quantity - p_quantity_sold),
    last_updated = NOW()
  WHERE location_id = p_location_id AND product_id = p_product_id;
  
  -- If no inventory record exists, create one
  IF NOT FOUND THEN
    INSERT INTO inventory (location_id, product_id, starting_quantity, current_quantity)
    VALUES (p_location_id, p_product_id, p_quantity_sold * 10, p_quantity_sold * 9);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_inventory()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_inventory_from_sale(NEW.location_id, NEW.product_id, NEW.quantity_sold);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER sales_inventory_update
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_inventory();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verify the fix
SELECT 'Database schema fixed successfully!' as status; 