const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3000'
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || ''

async function postRevalidate(body: Record<string, string>): Promise<void> {
  try {
    const res = await fetch(`${PORTAL_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${REVALIDATION_SECRET}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error(`[Revalidation] Portal responded with ${res.status} for`, body)
    }
  } catch (error) {
    console.error(
      '[Revalidation] Failed to reach portal:',
      error instanceof Error ? error.message : error,
    )
  }
}

export async function revalidatePortalTag(tag: string): Promise<void> {
  await postRevalidate({ tag })
}

export async function revalidatePortalPath(path: string): Promise<void> {
  await postRevalidate({ path })
}
