import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthURL } from '@/lib/google'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const redirect = request.nextUrl.searchParams.get('redirect') ?? '/dashboard/drive'
    const baseUrl = getGoogleAuthURL()
    const url = `${baseUrl}&state=${encodeURIComponent(redirect)}`
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la redirection Google.' }, { status: 500 })
  }
}
