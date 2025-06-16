import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            There was an issue with your authentication
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Authentication Failed</CardTitle>
            <CardDescription>
              We couldn't complete your authentication. This could be due to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• The confirmation link has expired</li>
              <li>• The link was already used</li>
              <li>• There was a temporary server error</li>
            </ul>

            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full">
                  Try Signing In
                </Button>
              </Link>
              
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Create New Account
                </Button>
              </Link>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                If you continue to have issues, please contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 