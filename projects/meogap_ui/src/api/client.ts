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

const HEALTH_KEYS = ['status', 'service', 'version'] as const
const API_ERROR_KEYS = ['code', 'message', 'service', 'operation'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function requireString(value: Record<string, unknown>, key: string): string {
  const field = value[key]
  if (typeof field !== 'string') {
    throw new Error(`Invalid payload: ${key} must be a string`)
  }
  return field
}

export function parseHealth(payload: unknown): Health {
  if (!isRecord(payload) || !hasExactKeys(payload, HEALTH_KEYS)) {
    throw new Error('Invalid payload: expected exactly status, service and version')
  }
  return {
    status: requireString(payload, 'status'),
    service: requireString(payload, 'service'),
    version: requireString(payload, 'version'),
  }
}

export function parseApiError(payload: unknown): ApiError {
  if (!isRecord(payload) || !hasExactKeys(payload, API_ERROR_KEYS)) {
    throw new Error('Invalid payload: expected exactly code, message, service and operation')
  }
  return {
    code: requireString(payload, 'code'),
    message: requireString(payload, 'message'),
    service: requireString(payload, 'service'),
    operation: requireString(payload, 'operation'),
  }
}

export class ApiRequestError extends Error {
  readonly error: ApiError

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.error = error
  }
}

export async function getHealth(): Promise<Health> {
  const response = await fetch('/api/v1/health')
  const payload: unknown = await response.json()
  if (!response.ok) {
    try {
      throw new ApiRequestError(parseApiError(payload))
    } catch (error) {
      if (error instanceof ApiRequestError) throw error
    }
    throw new Error(`Health request failed with status ${response.status}`)
  }
  return parseHealth(payload)
}
