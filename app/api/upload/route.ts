import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseVendorACsv, parseVendorBCsv, detectVendorFormat } from '@/lib/csv-processor'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting CSV upload processing...')
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('❌ No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      console.error('❌ File is not a CSV:', file.name)
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    console.log(`📁 Processing file: ${file.name} (${file.size} bytes)`)

    // Read file content
    const csvContent = await file.text()
    console.log(`📄 CSV content length: ${csvContent.length} characters`)
    
    // Detect vendor format
    let vendorFormat: 'ios-vending' | 'cantaloupe'
    try {
      vendorFormat = detectVendorFormat(csvContent)
      console.log(`🔍 Detected vendor format: ${vendorFormat}`)
    } catch (error) {
      console.error('❌ Format detection failed:', error)
      return NextResponse.json({ 
        error: 'Unknown CSV format. Please ensure the file matches iOS Vending Systems or Cantaloupe Systems format.' 
      }, { status: 400 })
    }

    // Parse CSV based on vendor format
    let parsedData
    try {
      if (vendorFormat === 'ios-vending') {
        console.log('📊 Parsing iOS Vending Systems format...')
        parsedData = await parseVendorACsv(csvContent)
      } else {
        console.log('📊 Parsing Cantaloupe Systems format...')
        parsedData = await parseVendorBCsv(csvContent)
      }
      
      console.log(`✅ Parsed data:`, {
        locations: parsedData.locations.length,
        products: parsedData.products.length,
        sales: parsedData.sales.length
      })
    } catch (error) {
      console.error('❌ CSV parsing failed:', error)
      return NextResponse.json({ 
        error: 'Failed to parse CSV file. Please check the format and ensure all required columns are present.' 
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Process the data
    const { sales, locations, products } = parsedData
    let newLocations = 0
    let newProducts = 0
    let processedRows = 0
    let conflictsResolved = 0
    let inventoryUpdates = 0
    let errors = 0

    console.log('🔄 Starting database operations...')

    // Insert locations if they don't exist
    console.log(`📍 Processing ${locations.length} locations...`)
    for (const location of locations) {
      try {
        const { data: existingLocation, error: locationCheckError } = await supabase
          .from('locations')
          .select('id, vendor')
          .eq('id', location.id)
          .single()

        if (locationCheckError && locationCheckError.code !== 'PGRST116') {
          console.error('❌ Location check error:', locationCheckError)
          continue
        }

        if (!existingLocation) {
          const { error: locationError } = await supabase.from('locations').insert(location)
          if (locationError) {
            console.error('❌ Location insert error:', locationError)
            errors++
          } else {
            newLocations++
            console.log(`✅ Created location: ${location.id}`)
          }
        } else if (existingLocation.vendor !== location.vendor) {
          // Handle vendor conflicts for same location ID
          conflictsResolved++
          console.log(`⚠️  Vendor conflict for location ${location.id}: ${existingLocation.vendor} vs ${location.vendor}`)
          // Update vendor information if needed
          await supabase
            .from('locations')
            .update({ vendor: `${existingLocation.vendor}, ${location.vendor}` })
            .eq('id', location.id)
        }
      } catch (error) {
        console.error('❌ Location processing error:', error)
        errors++
      }
    }

    // Insert products if they don't exist
    console.log(`📦 Processing ${products.length} products...`)
    for (const product of products) {
      try {
        const { data: existingProduct, error: productCheckError } = await supabase
          .from('products')
          .select('id, name, scancode')
          .eq('scancode', product.scancode)
          .single()

        if (productCheckError && productCheckError.code !== 'PGRST116') {
          console.error('❌ Product check error:', productCheckError)
          continue
        }

        if (!existingProduct) {
          const { error: productError } = await supabase.from('products').insert(product)
          if (productError) {
            console.error('❌ Product insert error:', productError)
            errors++
          } else {
            newProducts++
            console.log(`✅ Created product: ${product.name} (${product.scancode})`)
          }
        } else if (existingProduct.name !== product.name) {
          // Handle product name conflicts
          conflictsResolved++
          console.log(`⚠️  Product name conflict for scancode ${product.scancode}: "${existingProduct.name}" vs "${product.name}"`)
        }
      } catch (error) {
        console.error('❌ Product processing error:', error)
        errors++
      }
    }

    // Process sales and update inventory
    console.log(`💰 Processing ${sales.length} sales...`)
    for (const sale of sales) {
      try {
        console.log(`🔄 Processing sale: ${sale.location_id} - ${sale.product_id} (Qty: ${sale.quantity_sold})`)
        
        // Check if this sale already exists (prevent duplicates)
        const { data: existingSale, error: saleCheckError } = await supabase
          .from('sales')
          .select('id')
          .eq('raw_csv_hash', sale.raw_csv_hash)
          .single()

        if (saleCheckError && saleCheckError.code !== 'PGRST116') {
          console.error('❌ Sale check error:', saleCheckError)
          continue
        }

        if (!existingSale) {
          // Insert the sale record - the trigger will automatically update inventory
          const { error: saleError } = await supabase.from('sales').insert(sale)
          if (saleError) {
            console.error('❌ Sale insert error:', saleError)
            errors++
            continue
          }

          console.log(`✅ Created sale record for ${sale.location_id} - ${sale.product_id}`)

          // Check if inventory was updated by the trigger
          const { data: inventory, error: inventoryError } = await supabase
            .from('inventory')
            .select('*')
            .eq('location_id', sale.location_id)
            .eq('product_id', sale.product_id)
            .single()

          if (inventoryError && inventoryError.code !== 'PGRST116') {
            console.error('❌ Inventory check error:', inventoryError)
          } else if (inventory) {
            inventoryUpdates++
            console.log(`📊 Inventory updated: ${inventory.current_quantity} remaining`)
          } else {
            console.log(`📊 New inventory record created`)
          }

          processedRows++
        } else {
          console.log(`⏭️  Sale already exists, skipping: ${sale.raw_csv_hash}`)
        }
      } catch (error) {
        console.error('❌ Sale processing error:', error)
        errors++
      }
    }

    console.log('🎉 Processing complete:', {
      processedRows,
      newLocations,
      newProducts,
      conflictsResolved,
      inventoryUpdates,
      errors
    })

    return NextResponse.json({
      success: true,
      processedRows,
      newLocations,
      newProducts,
      conflictsResolved,
      inventoryUpdates,
      errors,
      vendorFormat,
      message: `Successfully processed ${processedRows} sales records. ${newLocations} new locations, ${newProducts} new products, ${inventoryUpdates} inventory updates, and ${conflictsResolved} conflicts resolved.`
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred during upload processing. Please check the console for details.' 
    }, { status: 500 })
  }
} 