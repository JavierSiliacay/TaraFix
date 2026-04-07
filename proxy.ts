import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { generalRatelimit } from '@/lib/ratelimit'

export async function proxy(request: NextRequest) {
  // 1. Rate Limiting Check
  // Identify the user by IP (handles local dev and proxy headers)
  const ip = (request as any).ip || request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
  
  // Only apply rate limiting to certain paths (e.g., API, auth, or the main app)
  // We can skip static assets which are already ignored by the config matcher
  if (
    request.nextUrl.pathname.startsWith('/api') || 
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  ) {
    const { success, limit, reset, remaining } = await generalRatelimit.limit(ip)
    
    if (!success) {
      return new NextResponse('Too many requests, slow down!', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      })
    }
  }

  // 2. Original Supabase Session Update
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
