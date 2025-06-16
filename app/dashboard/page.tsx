import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

async function getLocationsWithInventory() {
  const supabase = await createClient()
  
  console.log('🔍 Fetching dashboard data...')
  
  // First, get all locations
  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  if (locationsError) {
    console.error('❌ Error fetching locations:', locationsError)
    return []
  }

  console.log(`📍 Found ${locations?.length || 0} locations`)

  // Get inventory data separately (without foreign key join)
  const { data: inventoryData, error: inventoryError } = await supabase
    .from('inventory')
    .select('*')

  if (inventoryError) {
    console.error('❌ Error fetching inventory:', inventoryError)
    return locations.map((location: any) => ({
      ...location,
      inventory_summary: {
        total_products: 0,
        low_stock_items: 0,
        total_value: 0
      }
    }))
  }

  console.log(`📦 Found ${inventoryData?.length || 0} inventory records`)

  // Get products data separately
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')

  if (productsError) {
    console.error('❌ Error fetching products:', productsError)
  }

  console.log(`🏷️ Found ${productsData?.length || 0} products`)

  // Create a map of products by scancode for quick lookup
  const productsMap = new Map()
  if (productsData) {
    productsData.forEach(product => {
      productsMap.set(product.scancode, product)
    })
  }

  // Group inventory by location and enrich with product data
  const inventoryByLocation = inventoryData.reduce((acc: any, inv: any) => {
    if (!acc[inv.location_id]) {
      acc[inv.location_id] = []
    }
    
    // Add product information to inventory record
    const product = productsMap.get(inv.product_id)
    acc[inv.location_id].push({
      ...inv,
      product: product || { name: 'Unknown Product', scancode: inv.product_id, upc: inv.product_id }
    })
    
    return acc
  }, {})

  // Log inventory grouping for debugging
  Object.keys(inventoryByLocation).forEach(locationId => {
    console.log(`📍 Location ${locationId}: ${inventoryByLocation[locationId].length} inventory items`)
  })

  return locations.map((location: any) => {
    const inventory = inventoryByLocation[location.id] || []
    const totalProducts = inventory.length
    const lowStockItems = inventory.filter((inv: any) => inv.current_quantity <= 5).length
    const totalValue = inventory.reduce((sum: number, inv: any) => sum + (inv.current_quantity * 2.5), 0) // Assuming $2.50 avg price

    console.log(`📊 Location ${location.id}: ${totalProducts} products, ${lowStockItems} low stock, $${totalValue} value`)

    return {
      ...location,
      inventory_summary: {
        total_products: totalProducts,
        low_stock_items: lowStockItems,
        total_value: totalValue
      }
    }
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const locations = await getLocationsWithInventory()

  // Get overall statistics
  const totalLocations = locations.length
  const totalProducts = locations.reduce((sum: number, loc: any) => sum + loc.inventory_summary.total_products, 0)
  const totalLowStock = locations.reduce((sum: number, loc: any) => sum + loc.inventory_summary.low_stock_items, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Overview of all vending machine locations and inventory
              </p>
            </div>
            <div className="flex space-x-4">
              <Link href="/upload">
                <Button>Upload CSV</Button>
              </Link>
              <LogoutButton />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLocations}</div>
                <p className="text-xs text-muted-foreground">
                  Active vending machine locations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  Products across all locations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{totalLowStock}</div>
                <p className="text-xs text-muted-foreground">
                  Items needing restocking
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Locations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Locations</CardTitle>
              <CardDescription>
                All vending machine locations with inventory summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No locations found. Upload a CSV file to get started.</p>
                  <Link href="/upload" className="mt-4 inline-block">
                    <Button>Upload CSV</Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location Name</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Total Products</TableHead>
                      <TableHead>Low Stock Items</TableHead>
                      <TableHead>Estimated Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location: any) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>{location.vendor}</TableCell>
                        <TableCell>{location.inventory_summary.total_products}</TableCell>
                        <TableCell>
                          <span className={location.inventory_summary.low_stock_items > 0 ? 'text-orange-600 font-medium' : ''}>
                            {location.inventory_summary.low_stock_items}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(location.inventory_summary.total_value)}</TableCell>
                        <TableCell>
                          <Link href={`/locations/${location.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 