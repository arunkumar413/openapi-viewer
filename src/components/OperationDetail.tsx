import { MethodBadge } from '@/components/MethodBadge'
import { SchemaView } from '@/components/SchemaView'
import {
  buildRequestUrl,
  methodLabel,
  statusPhrase,
  type Operation,
  type Parameter,
  type ParsedSpec,
} from '@/lib/openapi'

export function OperationDetail({
  spec,
  operation,
  serverUrl,
}: {
  spec: ParsedSpec
  operation: Operation
  serverUrl: string
}) {
  const requestUrl = buildRequestUrl(
    serverUrl,
    operation.path,
    operation.parameters,
  )
  const pathParams = operation.parameters.filter((p) => p.in === 'path')
  const queryParams = operation.parameters.filter((p) => p.in === 'query')
  const headerParams = operation.parameters.filter((p) => p.in === 'header')
  const cookieParams = operation.parameters.filter((p) => p.in === 'cookie')

  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={operation.method} />
          {operation.deprecated ? (
            <span className="rounded bg-delete-bg px-2 py-0.5 text-[11px] font-semibold tracking-wide text-delete uppercase">
              Deprecated
            </span>
          ) : null}
          {operation.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-muted"
            >
              {tag}
            </span>
          ))}
        </div>
        <h2 className="font-mono text-2xl leading-tight font-medium break-all text-ink">
          {operation.path}
        </h2>
        {operation.summary ? (
          <p className="text-lg text-ink">{operation.summary}</p>
        ) : null}
        {operation.description ? (
          <p className="text-[15px] leading-relaxed text-ink-muted">
            {operation.description}
          </p>
        ) : null}
        {operation.operationId ? (
          <p className="font-mono text-xs text-ink-muted">
            operationId: {operation.operationId}
          </p>
        ) : null}
      </header>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Request
        </h3>
        <dl className="overflow-hidden rounded-lg border border-line bg-panel">
          <Field label="Request URL" value={requestUrl} mono />
          <Field label="Path" value={operation.path} mono />
          <Field label="Method" value={methodLabel(operation.method)} mono />
          <Field label="Server" value={serverUrl} mono />
        </dl>
      </section>

      <ParamTable title="Path parameters" parameters={pathParams} />
      <ParamTable title="Query parameters" parameters={queryParams} />
      <ParamTable title="Header parameters" parameters={headerParams} />
      <ParamTable title="Cookie parameters" parameters={cookieParams} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Request body
        </h3>
        {operation.requestBody ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              {operation.requestBody.required ? 'Required. ' : 'Optional. '}
              {operation.requestBody.description}
            </p>
            {operation.requestBody.content.map((payload) => (
              <div key={payload.mediaType} className="space-y-2">
                <p className="font-mono text-xs text-ink-muted">
                  {payload.mediaType}
                </p>
                <SchemaView
                  schema={payload.schema}
                  raw={spec.raw}
                  example={payload.example}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
            This operation does not send a request body.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Status codes & response body
        </h3>
        {operation.responses.length === 0 ? (
          <p className="text-sm text-ink-muted">No responses documented.</p>
        ) : (
          operation.responses.map((response) => (
            <div
              key={response.status}
              className="space-y-3 rounded-lg border border-line bg-panel p-4"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-base font-semibold text-ink">
                  {response.status}
                </span>
                <span className="text-sm text-ink-muted">
                  {statusPhrase(response.status)}
                </span>
              </div>
              {response.description ? (
                <p className="text-sm leading-relaxed text-ink">
                  {response.description}
                </p>
              ) : null}
              {response.content.length === 0 ? (
                <p className="text-sm text-ink-muted">No response body.</p>
              ) : (
                response.content.map((payload) => (
                  <div key={payload.mediaType} className="space-y-2">
                    <p className="font-mono text-xs text-ink-muted">
                      {payload.mediaType}
                    </p>
                    <SchemaView
                      schema={payload.schema}
                      raw={spec.raw}
                      example={payload.example}
                    />
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </section>
    </article>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid gap-1 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:items-start">
      <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd
        className={
          mono
            ? 'font-mono text-[13px] leading-relaxed break-all text-ink'
            : 'text-sm text-ink'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function ParamTable({
  title,
  parameters,
}: {
  title: string
  parameters: Parameter[]
}) {
  if (parameters.length === 0) return null
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
        {title}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-line bg-panel">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-line text-xs tracking-wide text-ink-muted uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Required</th>
              <th className="px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((parameter) => (
              <tr
                key={`${parameter.in}:${parameter.name}`}
                className="border-b border-line/80 last:border-0"
              >
                <td className="px-4 py-2.5 font-mono text-[13px]">
                  {parameter.name}
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-accent">
                  {parameter.schema?.format
                    ? `${parameter.schema.type ?? 'any'} (${parameter.schema.format})`
                    : (parameter.schema?.type ?? 'any')}
                </td>
                <td className="px-4 py-2.5 text-ink-muted">
                  {parameter.required ? 'Yes' : 'No'}
                </td>
                <td className="px-4 py-2.5 text-ink-muted">
                  {parameter.description ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
