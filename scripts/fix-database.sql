-- Database Schema for Vending Machine Inventory System
-- Run this script in your Supabase SQL editor to set up the complete database

-- 1. Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS sales CASCADE;
-- DROP TABLE IF EXISTS inventory CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS locations CASCADE;

-- 2. Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scancode TEXT UNIQUE NOT NULL,
  upc TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create inventory table with proper foreign keys
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- This will be the scancode from products table
  starting_quantity INTEGER NOT NULL DEFAULT 0,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create sales table with proper foreign keys
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- This will be the scancode from products table
  quantity_sold INTEGER NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL,
  raw_csv_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_location_product ON inventory(location_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_location_product ON sales(location_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_products_scancode ON products(scancode);
CREATE INDEX IF NOT EXISTS idx_products_upc ON products(upc);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies (adjust based on your auth requirements)
-- For now, allow all authenticated users to read/write
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

-- 9. Create a view for easier querying of inventory with product details
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

-- 10. Create a view for sales with product and location details
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

-- 11. Add function to update inventory from sales
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

-- 12. Create trigger to automatically update inventory when sales are inserted
CREATE OR REPLACE FUNCTION trigger_update_inventory()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_inventory_from_sale(NEW.location_id, NEW.product_id, NEW.quantity_sold);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_inventory_update
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_inventory();

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 14. Verify the setup
SELECT 'Database setup complete!' as status; 