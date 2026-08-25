import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // PENTING: getUser() menyegarkan token & menulis ulang cookie sesi.
  // TAPI dilewati untuk permintaan PREFETCH: Next.js memuat-awal banyak tautan
  // sekaligus, dan penyegaran token paralel bisa membuat sesi dianggap tidak
  // valid (refresh token berputar). Akibatnya halaman server mengalihkan ke
  // login dan Next.js memuat ulang penuh -> semua sesi GPS mati.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  if (!isPrefetch) {
    await supabase.auth.getUser()
  }

  return supabaseResponse
}