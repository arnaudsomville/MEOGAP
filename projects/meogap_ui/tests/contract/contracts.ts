import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type ContractsManifest = {
  version: number
  contracts: Record<string, string>
}

type UiPackage = {
  meogapContracts?: { provider?: string }
}

const here = dirname(fileURLToPath(import.meta.url))

function findRepositoryRoot(start: string): string {
  let current = start
  while (true) {
    if (existsSync(resolve(current, 'projects/meogap_interfaces/contracts.json'))) {
      return current
    }
    const parent = dirname(current)
    if (parent === current) {
      throw new Error(`Could not find the contracts manifest from ${start}`)
    }
    current = parent
  }
}

export function loadContract(): Record<string, unknown> {
  const repositoryRoot = findRepositoryRoot(here)
  const uiPackage = JSON.parse(readFileSync(resolvePackagePath(), 'utf8')) as UiPackage
  const provider = uiPackage.meogapContracts?.provider
  if (!provider) {
    throw new Error('package.json must declare meogapContracts.provider')
  }
  const manifest = JSON.parse(
    readFileSync(resolve(repositoryRoot, 'projects/meogap_interfaces/contracts.json'), 'utf8'),
  ) as ContractsManifest
  const relativePath = manifest.contracts[provider]
  if (!relativePath) {
    throw new Error(`No contract declared for provider ${provider}`)
  }
  return JSON.parse(
    readFileSync(resolve(repositoryRoot, 'projects/meogap_interfaces', relativePath), 'utf8'),
  ) as Record<string, unknown>
}

function resolvePackagePath(): string {
  return resolve(here, '../../package.json')
}
