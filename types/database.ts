export interface Database {
  public: {
    Tables: {
      locations: {
        Row: {
          id: string
          name: string
          vendor: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          vendor: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          vendor?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          scancode: string
          upc: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          scancode: string
          upc: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          scancode?: string
          upc?: string
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          location_id: string
          product_id: string
          starting_quantity: number
          current_quantity: number
          last_updated: string
        }
        Insert: {
          id?: string
          location_id: string
          product_id: string
          starting_quantity: number
          current_quantity: number
          last_updated?: string
        }
        Update: {
          id?: string
          location_id?: string
          product_id?: string
          starting_quantity?: number
          current_quantity?: number
          last_updated?: string
        }
      }
      sales: {
        Row: {
          id: string
          location_id: string
          product_id: string
          quantity_sold: number
          sale_date: string
          price: number
          total: number
          source: string
          raw_csv_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          location_id: string
          product_id: string
          quantity_sold: number
          sale_date: string
          price: number
          total: number
          source: string
          raw_csv_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          product_id?: string
          quantity_sold?: number
          sale_date?: string
          price?: number
          total?: number
          source?: string
          raw_csv_hash?: string
          created_at?: string
        }
      }
    }
  }
}

export type Location = Database['public']['Tables']['locations']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Inventory = Database['public']['Tables']['inventory']['Row']
export type Sale = Database['public']['Tables']['sales']['Row']

export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type InventoryInsert = Database['public']['Tables']['inventory']['Insert']
export type SaleInsert = Database['public']['Tables']['sales']['Insert']

// CSV Upload Types
export interface VendorACsvRow {
  Location_ID: string
  Product_Name: string
  Scancode: string
  Trans_Date: string
  Price: string
  Total_Amount: string
}

export interface VendorBCsvRow {
  Site_Code: string
  Item_Description: string
  UPC: string
  Sale_Date: string
  Unit_Price: string
  Final_Total: string
}

export interface NormalizedSale {
  location_id: string
  product_id: string
  quantity_sold: number
  sale_date: string
  price: number
  total: number
  source: string
  raw_csv_hash: string
}

// Extended types for UI
export interface LocationWithInventory extends Location {
  inventory_summary: {
    total_products: number
    low_stock_items: number
    total_value: number
  }
}

export interface ProductWithInventory extends Product {
  inventory: Inventory[]
  total_quantity: number
  is_low_stock: boolean
} 