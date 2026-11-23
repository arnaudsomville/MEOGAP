export type Health = {
  status: string
  service: string
  version: string
}

export type ApiError = {
  code: string
  message: string
  service: string
  operation: string
}

export async function getHealth(): Promise<Health> {
  const response = await fetch('/api/v1/health')
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`)
  }
  return response.json() as Promise<Health>
}
