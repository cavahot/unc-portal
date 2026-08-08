/**
 * Root-level not-found boundary.
 *
 * Catches paths that don't match any locale prefix (e.g. /unknown-path).
 * Redirects to the Spanish 404 page so the user sees the branded experience
 * instead of Next.js's default error UI.
 */
import { redirect } from 'next/navigation'

export default function RootNotFound() {
  redirect('/es/not-found')
}
