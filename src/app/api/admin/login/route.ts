import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'

// POST /api/admin/login - validate admin password server-side
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      )
    }

    // Get the admin password from environment variable (server-side only)
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set')
      return NextResponse.json(
        { success: false, error: 'Admin authentication is not configured' },
        { status: 500 }
      )
    }

    // Compare passwords
    if (password === adminPassword) {
      return NextResponse.json({ 
        success: true, 
        message: 'Admin access granted' 
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
