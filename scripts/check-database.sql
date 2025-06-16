-- Check Database Schema and Relationships
-- Run this script in your Supabase SQL editor to diagnose issues

-- 1. Check table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('locations', 'products', 'inventory', 'sales')
ORDER BY table_name, ordinal_position;

-- 2. Check foreign key constraints
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('locations', 'products', 'inventory', 'sales');

-- 3. Check if tables exist and have data
SELECT 
  'locations' as table_name,
  COUNT(*) as record_count
FROM locations
UNION ALL
SELECT 
  'products' as table_name,
  COUNT(*) as record_count
FROM products
UNION ALL
SELECT 
  'inventory' as table_name,
  COUNT(*) as record_count
FROM inventory
UNION ALL
SELECT 
  'sales' as table_name,
  COUNT(*) as record_count
FROM sales;

-- 4. Check sample data
SELECT 'Sample locations:' as info;
SELECT * FROM locations LIMIT 3;

SELECT 'Sample products:' as info;
SELECT * FROM products LIMIT 3;

SELECT 'Sample inventory:' as info;
SELECT * FROM inventory LIMIT 3;

SELECT 'Sample sales:' as info;
SELECT * FROM sales LIMIT 3;

-- 5. Check for orphaned records
SELECT 'Inventory without matching products:' as info;
SELECT i.* 
FROM inventory i 
LEFT JOIN products p ON i.product_id = p.scancode 
WHERE p.scancode IS NULL;

SELECT 'Sales without matching products:' as info;
SELECT s.* 
FROM sales s 
LEFT JOIN products p ON s.product_id = p.scancode 
WHERE p.scancode IS NULL;

SELECT 'Inventory without matching locations:' as info;
SELECT i.* 
FROM inventory i 
LEFT JOIN locations l ON i.location_id = l.id 
WHERE l.id IS NULL;

SELECT 'Sales without matching locations:' as info;
SELECT s.* 
FROM sales s 
LEFT JOIN locations l ON s.location_id = l.id 
WHERE l.id IS NULL; 