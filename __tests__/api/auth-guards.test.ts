import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock getSessionUser before importing routes
const mockGetSessionUser = vi.fn()
vi.mock('@/lib/auth', () => ({
  getSessionUser: () => mockGetSessionUser(),
  signToken: vi.fn(),
  verifyToken: vi.fn(),
  getCookieName: () => 'ct_session',
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) })) })),
    })),
    storage: { from: vi.fn(() => ({ upload: vi.fn(), getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })) })) },
  },
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}))

vi.mock('@/lib/google', () => ({
  refreshGoogleToken: vi.fn(),
}))

// Helper: create a minimal NextRequest
function makeRequest(url: string, options: RequestInit = {}) {
  const { NextRequest } = require('next/server')
  return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}

describe('Auth guards — toutes les API routes protégées', () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset()
  })

  it('POST /api/activity → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/activity/route')
    const req = makeRequest('http://localhost:3000/api/activity', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/chat/upload → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/chat/upload/route')
    const formData = new FormData()
    const req = makeRequest('http://localhost:3000/api/chat/upload', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/invoice/chat → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/invoice/chat/route')
    const req = makeRequest('http://localhost:3000/api/invoice/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/email/send → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/email/send/route')
    const req = makeRequest('http://localhost:3000/api/email/send', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/drive/list → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/drive/list/route')
    const req = makeRequest('http://localhost:3000/api/drive/list')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/drive/upload → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/drive/upload/route')
    const req = makeRequest('http://localhost:3000/api/drive/upload', {
      method: 'POST',
      body: new FormData(),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/drive/download → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/drive/download/route')
    const req = makeRequest('http://localhost:3000/api/drive/download?fileId=abc')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('DELETE /api/drive/delete → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { DELETE } = await import('@/app/api/drive/delete/route')
    const req = makeRequest('http://localhost:3000/api/drive/delete?fileId=abc', {
      method: 'DELETE',
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('PATCH /api/users/[id] → 401 sans session', async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const { PATCH } = await import('@/app/api/users/[id]/route')
    const req = makeRequest('http://localhost:3000/api/users/123', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: 'test' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) })
    expect(res.status).toBe(401)
  })

  it('PATCH /api/users/[id] → 403 si pas admin', async () => {
    mockGetSessionUser.mockResolvedValue({
      id: '1', username: 'lad', display_name: 'Lad', role: 'associe', avatar_color: '#fff',
    })
    const { PATCH } = await import('@/app/api/users/[id]/route')
    const req = makeRequest('http://localhost:3000/api/users/123', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: 'test' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) })
    expect(res.status).toBe(403)
  })
})
