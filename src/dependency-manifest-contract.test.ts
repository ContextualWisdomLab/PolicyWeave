import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

type DependencyManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

type LockPackage = {
  license?: string
  version?: string
}

type PackageLock = {
  packages: Record<string, DependencyManifest & LockPackage>
}

const packagePath = fileURLToPath(new URL('../package.json', import.meta.url))
const lockPath = fileURLToPath(new URL('../package-lock.json', import.meta.url))
const packageManifest = JSON.parse(readFileSync(packagePath, 'utf8')) as DependencyManifest
const packageLock = JSON.parse(readFileSync(lockPath, 'utf8')) as PackageLock
const lockManifest = packageLock.packages['']
const exactVersion = /^\d+\.\d+\.\d+$/

describe('direct dependency manifest contract', () => {
  it('pins every direct dependency to the reviewed lock resolution', () => {
    const directDependencies = [
      ...Object.entries(packageManifest.dependencies ?? {}),
      ...Object.entries(packageManifest.devDependencies ?? {}),
    ]
    const mutableOrMismatched = directDependencies.filter(
      ([name, version]) =>
        !exactVersion.test(version) ||
        packageLock.packages[`node_modules/${name}`]?.version !== version,
    )

    expect(mutableOrMismatched).toEqual([])
  })

  it('keeps compiler and bundler packages out of production dependencies', () => {
    const buildPackages = ['@vitejs/plugin-react', 'typescript', 'vite']

    expect(buildPackages.filter((name) => name in (packageManifest.dependencies ?? {}))).toEqual([])
    expect(buildPackages.filter((name) => !(name in (packageManifest.devDependencies ?? {})))).toEqual([])
  })

  it('keeps the lock root synchronized with the package manifest', () => {
    expect(lockManifest.dependencies).toEqual(packageManifest.dependencies)
    expect(lockManifest.devDependencies).toEqual(packageManifest.devDependencies)
  })

  it('retains a machine-readable license for every locked package', () => {
    const missingLicenses = Object.entries(packageLock.packages)
      .filter(([path, lockedPackage]) => path !== '' && !lockedPackage.license?.trim())
      .map(([path]) => path)

    expect(missingLicenses).toEqual([])
  })
})
