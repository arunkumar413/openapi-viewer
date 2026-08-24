import { useState } from 'react'
import {
  exampleFromSchema,
  resolveSchema,
  schemaTypeLabel,
  type JsonSchema,
} from '@/lib/openapi'
import { cn } from '@/lib/utils'

export function SchemaView({
  schema,
  raw,
  example,
}: {
  schema?: JsonSchema
  raw: Record<string, unknown>
  example?: unknown
}) {
  const resolved = resolveSchema(schema, raw)
  const preview =
    example ?? exampleFromSchema(resolved, raw)
  const [tab, setTab] = useState<'schema' | 'example'>('schema')

  if (!resolved && preview === undefined) {
    return (
      <p className="text-sm text-ink-muted">No body is defined for this media type.</p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="flex border-b border-line">
        <button
          type="button"
          className={tabClass(tab === 'schema')}
          onClick={() => setTab('schema')}
        >
          Schema
        </button>
        <button
          type="button"
          className={tabClass(tab === 'example')}
          onClick={() => setTab('example')}
        >
          Example
        </button>
      </div>
      {tab === 'schema' ? (
        <div className="divide-y divide-line/80 p-3">
          {resolved ? (
            <PropertyTree schema={resolved} raw={raw} name="body" required />
          ) : (
            <p className="text-sm text-ink-muted">No schema provided.</p>
          )}
        </div>
      ) : (
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-ink">
          {preview === undefined
            ? 'No example available.'
            : JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  )
}

function tabClass(active: boolean) {
  return cn(
    'px-4 py-2 text-sm',
    active
      ? 'border-b-2 border-accent font-medium text-ink'
      : 'text-ink-muted hover:text-ink',
  )
}

function PropertyTree({
  schema,
  raw,
  name,
  required,
  depth = 0,
}: {
  schema: JsonSchema
  raw: Record<string, unknown>
  name: string
  required?: boolean
  depth?: number
}) {
  const resolved = resolveSchema(schema, raw) ?? schema
  const typeLabel = schemaTypeLabel(resolved, raw)
  const properties = resolved.properties ?? {}
  const requiredFields = new Set(resolved.required ?? [])
  const childEntries = Object.entries(properties)
  const itemSchema = resolved.items
  const [open, setOpen] = useState(depth < 2)
  const expandable = childEntries.length > 0 || Boolean(itemSchema)

  return (
    <div style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
      <button
        type="button"
        className={cn(
          'flex w-full items-baseline gap-2 py-1.5 text-left',
          expandable ? 'cursor-pointer' : 'cursor-default',
        )}
        onClick={() => expandable && setOpen((value) => !value)}
        disabled={!expandable}
      >
        <span className="font-mono text-[13px] text-ink">{name}</span>
        <span className="font-mono text-[12px] text-accent">{typeLabel}</span>
        {required ? (
          <span className="text-[11px] font-medium uppercase tracking-wide text-delete">
            required
          </span>
        ) : (
          <span className="text-[11px] uppercase tracking-wide text-ink-muted">
            optional
          </span>
        )}
      </button>
      {resolved.description ? (
        <p className="pb-1 pl-0 text-[13px] leading-snug text-ink-muted">
          {resolved.description}
        </p>
      ) : null}
      {open && itemSchema ? (
        <PropertyTree
          schema={itemSchema}
          raw={raw}
          name="items"
          depth={depth + 1}
        />
      ) : null}
      {open
        ? childEntries.map(([key, child]) => (
            <PropertyTree
              key={key}
              schema={child}
              raw={raw}
              name={key}
              required={requiredFields.has(key)}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  )
}
