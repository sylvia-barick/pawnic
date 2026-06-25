// No Supabase auth session required — player identity is stored in localStorage.
// Middleware passes through all requests without session checks.

import { type NextRequest, NextResponse } from 'next/server'

export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
