import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthURL } from '@/lib/google'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const redirect = request.nextUrl.searchParams.get('redirect') ?? '/dashboard/drive'
  const baseUrl = getGoogleAuthURL()
  const url = `${baseUrl}&state=${encodeURIComponent(redirect)}`
  return NextResponse.redirect(url)
}
