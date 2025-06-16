'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: FileList | null) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please select a valid CSV file')
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const selectedFile = files[0]
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please select a valid CSV file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError('')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`Successfully processed ${result.processedRows} rows. ${result.newLocations} new locations and ${result.newProducts} new products created.`)
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch (err) {
      setError('An unexpected error occurred during upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop(e.dataTransfer.files)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload Sales Data</h1>
              <p className="mt-2 text-gray-600">
                Upload CSV files from iOS Vending Systems or Cantaloupe Systems
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">
                ← Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Drag and drop your CSV file here or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <div className="space-y-2">
                    <div className="text-gray-600">
                      {file ? (
                        <div>
                          <p className="font-medium text-green-600">File selected:</p>
                          <p className="text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">Drop your CSV file here</p>
                          <p className="text-sm">or click to browse</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Input
                  id="file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full"
                >
                  {uploading ? 'Processing...' : 'Upload and Process'}
                </Button>

                {error && (
                  <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="text-green-600 text-sm p-3 bg-green-50 rounded-md">
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supported Vendor Formats</CardTitle>
                <CardDescription>
                  The system automatically detects and processes these CSV formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">iOS Vending Systems</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    Location_ID,Product_Name,Scancode,Trans_Date,Price,Total_Amount
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Example: LOC001,Coca Cola,CC001,2024-01-15,2.50,5.00
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cantaloupe Systems</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    Site_Code,Item_Description,UPC,Sale_Date,Unit_Price,Final_Total
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Example: SITE001,Pepsi Cola,123456789,2024-01-15,2.00,4.00
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Data Processing Features</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Automatic vendor format detection</li>
                    <li>• Data normalization into unified schema</li>
                    <li>• Inventory updates based on sales data</li>
                    <li>• Duplicate prevention using hash verification</li>
                    <li>• Conflict resolution for overlapping locations</li>
                    <li>• Data integrity maintenance during processing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 