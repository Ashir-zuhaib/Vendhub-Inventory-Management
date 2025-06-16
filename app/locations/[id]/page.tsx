import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

async function getLocationWithInventory(locationId: string) {
  const supabase = await createClient()
  
  console.log(`🔍 Fetching details for location: ${locationId}`)
  
  // Get location details
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single()

  if (locationError || !location) {
    console.error('❌ Location not found:', locationError)
    return null
  }

  console.log(`📍 Found location: ${location.name}`)

  // Get inventory data for this location
  const { data: inventoryData, error: inventoryError } = await supabase
    .from('inventory')
    .select('*')
    .eq('location_id', locationId)

  if (inventoryError) {
    console.error('❌ Error fetching inventory:', inventoryError)
    return { ...location, inventory: [] }
  }

  console.log(`📦 Found ${inventoryData?.length || 0} inventory items`)

  // Get products data
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')

  if (productsError) {
    console.error('❌ Error fetching products:', productsError)
  }

  // Create products map
  const productsMap = new Map()
  if (productsData) {
    productsData.forEach(product => {
      productsMap.set(product.scancode, product)
    })
  }

  // Get sales data for this location
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .eq('location_id', locationId)
    .order('sale_date', { ascending: false })
    .limit(10)

  if (salesError) {
    console.error('❌ Error fetching sales:', salesError)
  }

  // Enrich inventory with product data
  const inventory = inventoryData.map(inv => {
    const product = productsMap.get(inv.product_id)
    return {
      ...inv,
      product: product || { name: 'Unknown Product', scancode: inv.product_id, upc: inv.product_id }
    }
  })

  // Enrich sales with product data
  const sales = salesData?.map(sale => {
    const product = productsMap.get(sale.product_id)
    return {
      ...sale,
      product: product || { name: 'Unknown Product', scancode: sale.product_id, upc: sale.product_id }
    }
  }) || []

  console.log(`💰 Found ${sales.length} recent sales`)

  return {
    ...location,
    inventory,
    sales
  }
}

export default async function LocationDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const location = await getLocationWithInventory(params.id)
  
  if (!location) {
    notFound()
  }

  const inventory = location.inventory || []
  const sales = location.sales || []
  
  // Calculate statistics
  const totalProducts = inventory.length
  const lowStockItems = inventory.filter((inv: any) => inv.current_quantity <= 5)
  const outOfStockItems = inventory.filter((inv: any) => inv.current_quantity === 0)
  const totalValue = inventory.reduce((sum: number, inv: any) => sum + (inv.current_quantity * 2.5), 0)
  const totalQuantity = inventory.reduce((sum: number, inv: any) => sum + inv.current_quantity, 0)
  
  // Calculate sales statistics
  const totalSales = sales.length
  const totalRevenue = sales.reduce((sum: number, sale: any) => sum + sale.total, 0)
  const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  ← Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{location.name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <Badge variant="secondary">{location.vendor}</Badge>
                  <span className="text-sm text-gray-500">
                    Created: {formatDate(location.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href="/upload">
                <Button>Upload CSV</Button>
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  Products in this location
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalQuantity}</div>
                <p className="text-xs text-muted-foreground">
                  Total units in stock
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
                <p className="text-xs text-muted-foreground">
                  Items needing restocking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Total inventory value
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                Current inventory levels for all products at this location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No inventory found for this location.</p>
                  <p className="text-sm text-gray-400 mt-2">Upload a CSV file to populate inventory data.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Scan Code</TableHead>
                      <TableHead>UPC</TableHead>
                      <TableHead>Starting Qty</TableHead>
                      <TableHead>Current Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((inv: any) => {
                      const product = inv.product
                      const isLowStock = inv.current_quantity <= 5
                      const isOutOfStock = inv.current_quantity === 0
                      const stockPercentage = inv.starting_quantity > 0 ? (inv.current_quantity / inv.starting_quantity) * 100 : 0
                      const itemValue = inv.current_quantity * 2.5
                      
                      return (
                        <TableRow key={inv.id} className={isLowStock ? 'bg-orange-50' : ''}>
                          <TableCell className="font-medium">{product?.name || 'Unknown'}</TableCell>
                          <TableCell className="font-mono text-sm">{product?.scancode || 'N/A'}</TableCell>
                          <TableCell className="font-mono text-sm">{product?.upc || 'N/A'}</TableCell>
                          <TableCell>{inv.starting_quantity}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : ''}`}>
                              {inv.current_quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                isOutOfStock ? 'destructive' : 
                                isLowStock ? 'secondary' : 
                                stockPercentage < 50 ? 'outline' : 'default'
                              }
                            >
                              {isOutOfStock ? 'Out of Stock' : 
                               isLowStock ? 'Low Stock' : 
                               stockPercentage < 50 ? 'Medium' : 'Good'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(itemValue)}</TableCell>
                          <TableCell className="text-sm">{formatDate(inv.last_updated)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                Latest sales transactions for this location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No sales data available.</p>
                  <p className="text-sm text-gray-400 mt-2">Sales will appear here after CSV uploads.</p>
                </div>
              ) : (
                <div>
                  {/* Sales Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">Total Sales</div>
                      <div className="text-2xl font-bold text-blue-900">{totalSales}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-green-600">Total Revenue</div>
                      <div className="text-2xl font-bold text-green-900">{formatCurrency(totalRevenue)}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-purple-600">Avg Sale Value</div>
                      <div className="text-2xl font-bold text-purple-900">{formatCurrency(avgSaleValue)}</div>
                    </div>
                  </div>

                  {/* Sales Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale: any) => {
                        const product = sale.product
                        return (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{product?.name || 'Unknown'}</TableCell>
                            <TableCell>{sale.quantity_sold}</TableCell>
                            <TableCell>{formatCurrency(sale.price)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell>
                            <TableCell className="text-sm">{formatDate(sale.sale_date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {sale.source}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 