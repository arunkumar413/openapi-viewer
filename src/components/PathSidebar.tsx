import { Search } from 'lucide-react'
import { MethodBadge } from '@/components/MethodBadge'
import { groupOperations, type Operation, type ParsedSpec } from '@/lib/openapi'
import { cn } from '@/lib/utils'

export function PathSidebar({
  spec,
  selectedId,
  query,
  onQueryChange,
  onSelect,
}: {
  spec: ParsedSpec
  selectedId: string | null
  query: string
  onQueryChange: (value: string) => void
  onSelect: (operation: Operation) => void
}) {
  const needle = query.trim().toLowerCase()
  const filtered = spec.operations.filter((operation) => {
    if (!needle) return true
    const haystack = [
      operation.path,
      operation.method,
      operation.summary,
      operation.operationId,
      ...operation.tags,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle)
  })

  const groups = groupOperations(filtered)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
          {spec.version ? `v${spec.version}` : 'OpenAPI'}
        </p>
        <h1 className="mt-1 text-lg font-semibold leading-tight text-ink">
          {spec.title}
        </h1>
        {spec.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-snug text-ink-muted">
            {spec.description}
          </p>
        ) : null}
        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink-muted" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter paths and methods"
            className="h-9 w-full rounded-md border border-line bg-paper pr-3 pl-8 text-sm text-ink outline-none placeholder:text-ink-muted/80 focus:border-accent"
          />
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="API paths">
        {groups.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-ink-muted">
            No paths match “{query}”.
          </p>
        ) : (
          groups.map(([path, operations]) => (
            <div key={path} className="mb-4 bg-olive-300 rounded-md">
              <p className="truncate px-2 pt-2 pb-1 font-mono text-[18px] text-ink-muted font-bold">
                {path}
              </p>
              <ul className="flex flex-col gap-0.5">
                {operations.map((operation) => {
                  const selected = operation.id === selectedId
                  return (
                    <li key={operation.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(operation)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left',
                          selected ? 'bg-green-100' : 'hover:bg-line/70',
                        )}
                      >
                        <MethodBadge method={operation.method} compact />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {operation.summary ?? operation.operationId ?? path}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </div>
  )
}
