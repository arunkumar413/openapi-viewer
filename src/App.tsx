import { Menu, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { bundledSpecs } from '@/data/specs'
import { LoadSpec } from '@/components/LoadSpec'
import { OperationDetail } from '@/components/OperationDetail'
import { PathSidebar } from '@/components/PathSidebar'
import { Button } from '@/components/ui/button'
import {
  parseOpenApiDocument,
  type Operation,
  type ParsedSpec,
} from '@/lib/openapi'

const bundledSpec = bundledSpecs[0].spec

export default function App() {
  const [spec, setSpec] = useState<ParsedSpec>(bundledSpec)
  const [selectedBundledId, setSelectedBundledId] = useState(bundledSpecs[0].id)
  const [selectedId, setSelectedId] = useState<string>(
    bundledSpec.operations[0]?.id ?? '',
  )
  const [query, setQuery] = useState('')
  const [serverIndex, setServerIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const operation = useMemo(
    () => spec.operations.find((item) => item.id === selectedId) ?? spec.operations[0],
    [spec, selectedId],
  )
  const serverUrl = spec.servers[serverIndex]?.url ?? spec.servers[0]?.url ?? '/'

  function applySpec(next: ParsedSpec) {
    setSpec(next)
    setSelectedBundledId('')
    setSelectedId(next.operations[0]?.id ?? '')
    setServerIndex(0)
    setQuery('')
    setLoadError(null)
    setLoadOpen(false)
    setSidebarOpen(false)
  }

  function loadText(text: string) {
    try {
      applySpec(parseOpenApiDocument(text))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not read this document.')
    }
  }

  async function loadUrl(url: string) {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Request failed (${response.status} ${response.statusText}).`)
      }
      loadText(await response.text())
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not fetch that URL.'
      setLoadError(
        `${message} If this is a CORS block, download the file and open it from disk.`,
      )
    } finally {
      setLoading(false)
    }
  }

  function selectOperation(next: Operation) {
    setSelectedId(next.id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-full min-h-0 bg-paper">
      <aside className="hidden w-[22rem] shrink-0 border-r border-line bg-panel md:flex md:flex-col">
        <PathSidebar
          spec={spec}
          selectedId={operation?.id ?? null}
          query={query}
          onQueryChange={setQuery}
          onSelect={selectOperation}
        />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(22rem,90vw)] flex-col bg-panel shadow-xl">
            <PathSidebar
              spec={spec}
              selectedId={operation?.id ?? null}
              query={query}
              onQueryChange={setQuery}
              onSelect={selectOperation}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open path list"
          >
            <Menu className="size-5" />
          </Button>
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden text-ink-muted sm:inline">Document</span>
            <select
              value={selectedBundledId}
              onChange={(event) => {
                const bundled = bundledSpecs.find(({ id }) => id === event.target.value)
                if (bundled) {
                  applySpec(bundled.spec)
                  setSelectedBundledId(bundled.id)
                }
              }}
              className="h-9 min-w-0 flex-1 rounded-md border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-accent sm:max-w-xs"
            >
              <option value="" disabled>
                {selectedBundledId ? 'Select bundled document' : `${spec.title} (loaded)`}
              </option>
              {bundledSpecs.map((bundled) => (
                <option key={bundled.id} value={bundled.id}>
                  {bundled.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden text-ink-muted sm:inline">Server</span>
            <select
              value={serverIndex}
              onChange={(event) => setServerIndex(Number(event.target.value))}
              className="h-9 min-w-0 flex-1 rounded-md border border-line bg-paper px-2 font-mono text-[13px] text-ink outline-none focus:border-accent sm:max-w-md"
            >
              {spec.servers.map((server, index) => (
                <option key={`${server.url}-${index}`} value={index}>
                  {server.description
                    ? `${server.description} — ${server.url}`
                    : server.url}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" onClick={() => setLoadOpen(true)}>
            <Upload className="size-4" />
            Open spec
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          {operation ? (
            <OperationDetail
              spec={spec}
              operation={operation}
              serverUrl={serverUrl}
            />
          ) : (
            <p className="text-ink-muted">This document has no operations.</p>
          )}
        </main>
      </div>

      <LoadSpec
        open={loadOpen}
        onClose={() => {
          setLoadOpen(false)
          setLoadError(null)
        }}
        onLoadText={loadText}
        onLoadUrl={loadUrl}
        error={loadError}
        loading={loading}
      />
    </div>
  )
}
