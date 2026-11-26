import type { ApiError, ApiResponse } from './types'

const API_PREFIX = '/api/v1'
const DEMO_HEADER = 'X-MEOGAP-Demo'
const DEMO_BEARER_TOKEN = import.meta.env.VITE_MEOGAP_DEMO_TOKEN ?? 'm0-ui-demo-token'
const HEALTH_KEYS = ['status', 'service', 'version'] as const
const API_ERROR_KEYS = ['code', 'message', 'service', 'operation'] as const

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

export function parseApiError(payload: unknown): ApiError {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload) ||
    !hasExactKeys(payload as Record<string, unknown>, API_ERROR_KEYS)
  ) {
    throw new Error('Invalid payload: expected exactly code, message, service and operation')
  }
  const record = payload as Record<string, unknown>
  return {
    code: requireString(record, 'code'),
    message: requireString(record, 'message'),
    service: requireString(record, 'service'),
    operation: requireString(record, 'operation'),
  }
}

export function requireString(value: Record<string, unknown>, key: string): string {
  const field = value[key]
  if (typeof field !== 'string') {
    throw new Error(`Invalid payload: ${key} must be a string`)
  }
  return field
}

export function requireStringFrom(value: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    if (typeof value[key] === 'string') return value[key]
  }
  throw new Error(`Invalid payload: expected a string field named ${keys.join(' or ')}`)
}

export function optionalStringFrom(
  value: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const field = value[key]
    if (typeof field === 'string') return field
    if (field === null || field === undefined) continue
    throw new Error(`Invalid payload: ${key} must be a string or null`)
  }
  return null
}

export function optionalNumberFrom(
  value: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    const field = value[key]
    if (typeof field === 'number' && Number.isFinite(field)) return field
    if (field === null || field === undefined) continue
    throw new Error(`Invalid payload: ${key} must be a finite number or null`)
  }
  return null
}

export function optionalStringListFrom(
  value: Record<string, unknown>,
  keys: readonly string[],
): string[] {
  for (const key of keys) {
    const field = value[key]
    if (field === null || field === undefined) continue
    if (!Array.isArray(field) || field.some((item) => typeof item !== 'string')) {
      throw new Error(`Invalid payload: ${key} must be an array of strings`)
    }
    return field as string[]
  }
  return []
}

export function optionalIntegerListFrom(
  value: Record<string, unknown>,
  keys: readonly string[],
): number[] {
  for (const key of keys) {
    const field = value[key]
    if (field === null || field === undefined) continue
    if (!Array.isArray(field) || field.some((item) => !Number.isInteger(item))) {
      throw new Error(`Invalid payload: ${key} must be an array of integers`)
    }
    return field as number[]
  }
  return []
}

export function requirePositiveInteger(value: Record<string, unknown>, key: string): number {
  const field = value[key]
  if (!Number.isInteger(field) || (field as number) < 1) {
    throw new Error(`Invalid payload: ${key} must be a positive integer`)
  }
  return field as number
}

export function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Invalid payload: ${message}`)
  return value
}

export function parseCoordinate(value: unknown): number[] {
  if (!Array.isArray(value) || value.length < 2 || value.some((item) => typeof item !== 'number')) {
    throw new Error('Invalid payload: geometry coordinates must contain numeric positions')
  }
  return value as number[]
}

export function parsePolygonCoordinates(value: unknown): number[][][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid payload: polygon coordinates must contain at least one ring')
  }
  return value.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error('Invalid payload: polygon rings must contain at least four positions')
    }
    return ring.map(parseCoordinate)
  })
}

export function parseMultiPolygonCoordinates(value: unknown): number[][][][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid payload: multipolygon coordinates must contain at least one polygon')
  }
  return value.map(parsePolygonCoordinates)
}

export function parseEnvelopeList(value: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value
  const record = requireRecord(
    value,
    `expected an array or an object containing ${keys.join(' or ')}`,
  )
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key]
  }
  throw new Error(`Invalid payload: expected an array field named ${keys.join(' or ')}`)
}

function isDemoResponse(response: Response): boolean {
  return response.headers?.get?.(DEMO_HEADER)?.toLowerCase() === 'true'
}

function withDemoBearer(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
    },
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new Error(`API response ${response.status} did not contain JSON`)
  }
}

export async function requestJson<T>(
  path: string,
  parser: (payload: unknown) => T,
  init?: RequestInit,
  requiresBearer = true,
): Promise<ApiResponse<T>> {
  const response = await fetch(path, requiresBearer ? withDemoBearer(init) : init)
  const payload = await readJson(response)
  if (!response.ok) {
    throwApiError(response, payload)
  }
  return { data: parser(payload), isDemo: isDemoResponse(response) }
}

export async function requestNoContent(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<undefined>> {
  const response = await fetch(path, withDemoBearer(init))
  if (!response.ok) {
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throwApiError(response, payload)
  }
  return { data: undefined, isDemo: isDemoResponse(response) }
}

function throwApiError(response: Response, payload: unknown): never {
  try {
    throw new ApiRequestError(parseApiError(payload))
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
  }
  throw new Error(`API request failed with status ${response.status}`)
}

export function jsonRequest(method: 'POST' | 'PATCH', payload: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

export function idPathSegment(id: string): string {
  return encodeURIComponent(id)
}

export class ApiRequestError extends Error {
  readonly error: ApiError

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.error = error
  }
}

export { API_PREFIX, HEALTH_KEYS, API_ERROR_KEYS }
