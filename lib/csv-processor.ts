import { parse } from 'csv-parse'
import { createHash } from 'crypto'
import { 
  VendorACsvRow, 
  VendorBCsvRow, 
  NormalizedSale,
  LocationInsert,
  ProductInsert
} from '@/types/database'

export function generateHash(content: string): string {
  return createHash('md5').update(content).digest('hex')
}

export function parseVendorACsv(csvContent: string): Promise<{
  sales: NormalizedSale[]
  locations: LocationInsert[]
  products: ProductInsert[]
}> {
  return new Promise((resolve, reject) => {
    const sales: NormalizedSale[] = []
    const locations = new Map<string, LocationInsert>()
    const products = new Map<string, ProductInsert>()
    
    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records: VendorACsvRow[]) => {
      if (err) {
        reject(err)
        return
      }

      records.forEach((record, index) => {
        const rowHash = generateHash(`${record.Location_ID}-${record.Scancode}-${record.Trans_Date}-${record.Total_Amount}`)
        
        // Create location if not exists
        if (!locations.has(record.Location_ID)) {
          locations.set(record.Location_ID, {
            id: record.Location_ID,
            name: `Location ${record.Location_ID}`,
            vendor: 'iOS Vending Systems'
          })
        }

        // Create product if not exists
        if (!products.has(record.Scancode)) {
          products.set(record.Scancode, {
            name: record.Product_Name,
            scancode: record.Scancode,
            upc: record.Scancode // iOS Vending Systems uses scancode as UPC
          })
        }

        // Calculate quantity from total amount and price
        const price = parseFloat(record.Price) || 0
        const total = parseFloat(record.Total_Amount) || 0
        const quantity = price > 0 ? Math.round(total / price) : 1

        sales.push({
          location_id: record.Location_ID,
          product_id: record.Scancode,
          quantity_sold: quantity,
          sale_date: new Date(record.Trans_Date).toISOString(),
          price: price,
          total: total,
          source: 'iOS Vending Systems',
          raw_csv_hash: rowHash
        })
      })

      resolve({
        sales,
        locations: Array.from(locations.values()),
        products: Array.from(products.values())
      })
    })
  })
}

export function parseVendorBCsv(csvContent: string): Promise<{
  sales: NormalizedSale[]
  locations: LocationInsert[]
  products: ProductInsert[]
}> {
  return new Promise((resolve, reject) => {
    const sales: NormalizedSale[] = []
    const locations = new Map<string, LocationInsert>()
    const products = new Map<string, ProductInsert>()
    
    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records: VendorBCsvRow[]) => {
      if (err) {
        reject(err)
        return
      }

      records.forEach((record, index) => {
        const rowHash = generateHash(`${record.Site_Code}-${record.UPC}-${record.Sale_Date}-${record.Final_Total}`)
        
        // Create location if not exists
        if (!locations.has(record.Site_Code)) {
          locations.set(record.Site_Code, {
            id: record.Site_Code,
            name: `Site ${record.Site_Code}`,
            vendor: 'Cantaloupe Systems'
          })
        }

        // Create product if not exists
        if (!products.has(record.UPC)) {
          products.set(record.UPC, {
            name: record.Item_Description,
            scancode: record.UPC, // Cantaloupe Systems uses UPC as scancode
            upc: record.UPC
          })
        }

        // Calculate quantity from final total and unit price
        const price = parseFloat(record.Unit_Price) || 0
        const total = parseFloat(record.Final_Total) || 0
        const quantity = price > 0 ? Math.round(total / price) : 1

        sales.push({
          location_id: record.Site_Code,
          product_id: record.UPC,
          quantity_sold: quantity,
          sale_date: new Date(record.Sale_Date).toISOString(),
          price: price,
          total: total,
          source: 'Cantaloupe Systems',
          raw_csv_hash: rowHash
        })
      })

      resolve({
        sales,
        locations: Array.from(locations.values()),
        products: Array.from(products.values())
      })
    })
  })
}

export function detectVendorFormat(csvContent: string): 'ios-vending' | 'cantaloupe' {
  const firstLine = csvContent.split('\n')[0].toLowerCase()
  
  if (firstLine.includes('location_id') && firstLine.includes('product_name')) {
    return 'ios-vending'
  } else if (firstLine.includes('site_code') && firstLine.includes('item_description')) {
    return 'cantaloupe'
  }
  
  throw new Error('Unknown CSV format. Expected iOS Vending Systems or Cantaloupe Systems format.')
}

// Enhanced data processing utilities
export function normalizeLocationName(locationId: string, vendor: string): string {
  if (vendor === 'iOS Vending Systems') {
    return `iOS Location ${locationId}`
  } else if (vendor === 'Cantaloupe Systems') {
    return `Cantaloupe Site ${locationId}`
  }
  return `Location ${locationId}`
}

export function resolveDataConflicts(existingData: any, newData: any): any {
  // Implement conflict resolution logic
  // For now, prefer newer data with timestamp comparison
  if (newData.updated_at > existingData.updated_at) {
    return newData
  }
  return existingData
}

// Utility function to calculate inventory from sales data
export function calculateInventoryFromSales(sales: NormalizedSale[]): Map<string, { starting: number, current: number }> {
  const inventory = new Map<string, { starting: number, current: number }>()
  
  sales.forEach(sale => {
    const key = `${sale.location_id}-${sale.product_id}`
    const existing = inventory.get(key) || { starting: 0, current: 0 }
    
    // Add to starting inventory (assume 10x the sale quantity as starting inventory)
    existing.starting += sale.quantity_sold * 10
    // Subtract from current inventory
    existing.current = Math.max(0, existing.starting - sale.quantity_sold)
    
    inventory.set(key, existing)
  })
  
  return inventory
} 