import { load as loadYaml } from 'js-yaml'

export const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

export type JsonSchema = {
  $ref?: string
  type?: string | string[]
  format?: string
  description?: string
  title?: string
  example?: unknown
  examples?: unknown[] | Record<string, unknown>
  default?: unknown
  enum?: unknown[]
  nullable?: boolean
  required?: string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  additionalProperties?: boolean | JsonSchema
  allOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  contentMediaType?: string
}

export type Parameter = {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie' | string
  required?: boolean
  description?: string
  schema?: JsonSchema
  example?: unknown
}

export type MediaPayload = {
  mediaType: string
  schema?: JsonSchema
  example?: unknown
}

export type RequestBody = {
  description?: string
  required?: boolean
  content: MediaPayload[]
}

export type ResponseItem = {
  status: string
  description?: string
  content: MediaPayload[]
  headers?: Record<string, { description?: string; schema?: JsonSchema }>
}

export type Operation = {
  id: string
  path: string
  method: HttpMethod
  summary?: string
  description?: string
  operationId?: string
  tags: string[]
  deprecated?: boolean
  parameters: Parameter[]
  requestBody?: RequestBody
  responses: ResponseItem[]
}

export type ParsedSpec = {
  title: string
  version: string
  description?: string
  servers: { url: string; description?: string }[]
  operations: Operation[]
  raw: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function parseOpenApiDocument(source: string): ParsedSpec {
  const trimmed = source.trim()
  if (!trimmed) {
    throw new Error('The document is empty.')
  }

  let raw: unknown
  try {
    raw = trimmed.startsWith('{') || trimmed.startsWith('[')
      ? JSON.parse(trimmed)
      : loadYaml(trimmed)
  } catch (error) {
    throw new Error(
      `Could not parse JSON or YAML: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  }

  return parseOpenApiValue(raw)
}

export function parseOpenApiValue(raw: unknown): ParsedSpec {
  if (!isRecord(raw)) {
    throw new Error('OpenAPI document must be an object.')
  }

  const openapi = asString(raw.openapi) ?? asString(raw.swagger)
  if (!openapi) {
    throw new Error('This file is not an OpenAPI or Swagger document.')
  }

  const info = isRecord(raw.info) ? raw.info : {}
  const servers = Array.isArray(raw.servers)
    ? raw.servers
        .filter(isRecord)
        .map((server) => ({
          url: asString(server.url) ?? '/',
          description: asString(server.description),
        }))
    : swaggerHostToServers(raw)

  const paths = isRecord(raw.paths) ? raw.paths : {}
  const operations: Operation[] = []

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem) || path.startsWith('x-')) continue
    const sharedParams = collectParameters(pathItem.parameters, raw)

    for (const method of HTTP_METHODS) {
      const op = pathItem[method]
      if (!isRecord(op)) continue

      const parameters = [
        ...sharedParams,
        ...collectParameters(op.parameters, raw),
      ]
      const uniqueParams = dedupeParameters(parameters)

      operations.push({
        id: `${method}:${path}`,
        path,
        method,
        summary: asString(op.summary),
        description: asString(op.description),
        operationId: asString(op.operationId),
        tags: Array.isArray(op.tags)
          ? op.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
        deprecated: op.deprecated === true,
        parameters: uniqueParams,
        requestBody: parseRequestBody(op.requestBody ?? pathItem.requestBody, raw),
        responses: parseResponses(op.responses, raw),
      })
    }
  }

  if (operations.length === 0) {
    throw new Error('No HTTP operations were found under paths.')
  }

  return {
    title: asString(info.title) ?? 'Untitled API',
    version: asString(info.version) ?? '',
    description: asString(info.description),
    servers: servers.length > 0 ? servers : [{ url: '/' }],
    operations,
    raw,
  }
}

function swaggerHostToServers(raw: Record<string, unknown>) {
  const host = asString(raw.host)
  if (!host) return []
  const schemes = Array.isArray(raw.schemes)
    ? raw.schemes.filter((s): s is string => typeof s === 'string')
    : ['https']
  const basePath = asString(raw.basePath) ?? ''
  return schemes.map((scheme) => ({
    url: `${scheme}://${host}${basePath}`,
    description: scheme,
  }))
}

function collectParameters(value: unknown, raw: Record<string, unknown>): Parameter[] {
  if (!Array.isArray(value)) return []
  const result: Parameter[] = []
  for (const item of value) {
    const resolved = resolveRef(item, raw)
    if (!isRecord(resolved)) continue
    const name = asString(resolved.name)
    const location = asString(resolved.in)
    if (!name || !location) continue
    result.push({
      name,
      in: location,
      required: resolved.required === true || location === 'path',
      description: asString(resolved.description),
      schema: isRecord(resolved.schema)
        ? (resolved.schema as JsonSchema)
        : swagger2Schema(resolved),
      example: resolved.example,
    })
  }
  return result
}

function swagger2Schema(param: Record<string, unknown>): JsonSchema | undefined {
  if (typeof param.type !== 'string') return undefined
  return {
    type: param.type,
    format: asString(param.format),
    enum: Array.isArray(param.enum) ? param.enum : undefined,
    items: isRecord(param.items) ? (param.items as JsonSchema) : undefined,
  }
}

function dedupeParameters(parameters: Parameter[]): Parameter[] {
  const seen = new Set<string>()
  const result: Parameter[] = []
  for (const parameter of parameters) {
    const key = `${parameter.in}:${parameter.name}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(parameter)
  }
  return result
}

function parseRequestBody(value: unknown, raw: Record<string, unknown>): RequestBody | undefined {
  const resolved = resolveRef(value, raw)
  if (!isRecord(resolved)) return undefined
  const content = parseContent(resolved.content)
  if (content.length === 0 && resolved.schema) {
    content.push({
      mediaType: 'application/json',
      schema: isRecord(resolved.schema) ? (resolved.schema as JsonSchema) : undefined,
    })
  }
  if (content.length === 0) return undefined
  return {
    description: asString(resolved.description),
    required: resolved.required === true,
    content,
  }
}

function parseResponses(value: unknown, raw: Record<string, unknown>): ResponseItem[] {
  if (!isRecord(value)) return []
  const responses: ResponseItem[] = []
  for (const [status, body] of Object.entries(value)) {
    const resolved = resolveRef(body, raw)
    if (!isRecord(resolved)) continue
    const content = parseContent(resolved.content)
    if (content.length === 0 && resolved.schema) {
      content.push({
        mediaType: 'application/json',
        schema: isRecord(resolved.schema) ? (resolved.schema as JsonSchema) : undefined,
      })
    }
    const headers = isRecord(resolved.headers)
      ? Object.fromEntries(
          Object.entries(resolved.headers).map(([name, header]) => {
            const resolvedHeader = resolveRef(header, raw)
            return [
              name,
              {
                description: isRecord(resolvedHeader)
                  ? asString(resolvedHeader.description)
                  : undefined,
                schema: isRecord(resolvedHeader) && isRecord(resolvedHeader.schema)
                  ? (resolvedHeader.schema as JsonSchema)
                  : undefined,
              },
            ]
          }),
        )
      : undefined
    responses.push({
      status,
      description: asString(resolved.description),
      content,
      headers,
    })
  }
  return responses.sort((a, b) => statusOrder(a.status) - statusOrder(b.status))
}

function statusOrder(status: string): number {
  if (status === 'default') return 999
  const n = Number(status)
  return Number.isFinite(n) ? n : 1000
}

function parseContent(value: unknown): MediaPayload[] {
  if (!isRecord(value)) return []
  return Object.entries(value).map(([mediaType, payload]) => {
    const record = isRecord(payload) ? payload : {}
    return {
      mediaType,
      schema: isRecord(record.schema) ? (record.schema as JsonSchema) : undefined,
      example:
        record.example ??
        firstNamedExample(record.examples),
    }
  })
}

function firstNamedExample(examples: unknown): unknown {
  if (!isRecord(examples)) return undefined
  const first = Object.values(examples)[0]
  if (isRecord(first) && 'value' in first) return first.value
  return first
}

export function resolveRef(value: unknown, raw: Record<string, unknown>, seen = new Set<string>()): unknown {
  if (!isRecord(value) || typeof value.$ref !== 'string') return value
  const ref = value.$ref
  if (seen.has(ref)) return { description: `Circular reference ${ref}` }
  seen.add(ref)
  if (!ref.startsWith('#/')) return value
  const parts = ref
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
  let current: unknown = raw
  for (const part of parts) {
    if (!isRecord(current) || !(part in current)) return value
    current = current[part]
  }
  const resolved = resolveRef(current, raw, seen)
  if (isRecord(resolved) && isRecord(value)) {
    const rest = { ...value }
    delete rest.$ref
    return { ...resolved, ...rest }
  }
  return resolved
}

export function resolveSchema(
  schema: JsonSchema | undefined,
  raw: Record<string, unknown>,
): JsonSchema | undefined {
  if (!schema) return undefined
  const resolved = resolveRef(schema, raw)
  return isRecord(resolved) ? (resolved as JsonSchema) : schema
}

export function schemaTypeLabel(schema: JsonSchema | undefined, raw: Record<string, unknown>): string {
  const resolved = resolveSchema(schema, raw)
  if (!resolved) return 'any'
  if (resolved.enum?.length) {
    return resolved.enum.map((value) => JSON.stringify(value)).join(' | ')
  }
  if (resolved.oneOf?.length) return 'oneOf'
  if (resolved.anyOf?.length) return 'anyOf'
  if (resolved.allOf?.length) return 'allOf'
  const types = Array.isArray(resolved.type)
    ? resolved.type.join(' | ')
    : resolved.type
  if (types === 'array') {
    const items = schemaTypeLabel(resolved.items, raw)
    return `${items}[]`
  }
  if (resolved.format) return `${types ?? 'object'} (${resolved.format})`
  return types ?? (resolved.properties ? 'object' : 'any')
}

export function exampleFromSchema(
  schema: JsonSchema | undefined,
  raw: Record<string, unknown>,
  depth = 0,
  seen: string[] = [],
): unknown {
  if (!schema || depth > 8) return undefined
  const resolved = resolveSchema(schema, raw)
  if (!resolved) return undefined
  if (resolved.example !== undefined) return resolved.example
  if (resolved.default !== undefined) return resolved.default
  if (resolved.enum?.length) return resolved.enum[0]
  if (resolved.$ref && seen.includes(resolved.$ref)) return {}
  const nextSeen = resolved.$ref ? [...seen, resolved.$ref] : seen

  if (resolved.allOf?.length) {
    const merged: Record<string, unknown> = {}
    for (const part of resolved.allOf) {
      const value = exampleFromSchema(part, raw, depth + 1, nextSeen)
      if (isRecord(value)) Object.assign(merged, value)
    }
    return merged
  }
  if (resolved.oneOf?.[0]) return exampleFromSchema(resolved.oneOf[0], raw, depth + 1, nextSeen)
  if (resolved.anyOf?.[0]) return exampleFromSchema(resolved.anyOf[0], raw, depth + 1, nextSeen)

  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type
  if (type === 'array' || resolved.items) {
    const item = exampleFromSchema(resolved.items, raw, depth + 1, nextSeen)
    return [item ?? 'item']
  }
  if (type === 'object' || resolved.properties) {
    const obj: Record<string, unknown> = {}
    for (const [key, prop] of Object.entries(resolved.properties ?? {})) {
      obj[key] = exampleFromSchema(prop, raw, depth + 1, nextSeen)
    }
    return obj
  }
  if (type === 'integer' || type === 'number') return 0
  if (type === 'boolean') return true
  if (type === 'null') return null
  if (resolved.format === 'date-time') return '2026-08-24T12:00:00Z'
  if (resolved.format === 'date') return '2026-08-24'
  if (resolved.format === 'email') return 'reader@example.com'
  if (resolved.format === 'uuid') return '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  if (resolved.format === 'uri') return 'https://example.com'
  return 'string'
}

export function buildRequestUrl(
  serverUrl: string,
  path: string,
  parameters: Parameter[],
): string {
  const base = serverUrl.replace(/\/+$/, '')
  let filled = path
  for (const parameter of parameters.filter((p) => p.in === 'path')) {
    const sample =
      parameter.example ??
      parameter.schema?.example ??
      `{${parameter.name}}`
    filled = filled.replace(
      `{${parameter.name}}`,
      encodeURIComponent(String(sample)),
    )
  }
  const query = parameters
    .filter((p) => p.in === 'query')
    .map((parameter) => {
      const sample =
        parameter.example ?? parameter.schema?.example ?? parameter.name
      return `${encodeURIComponent(parameter.name)}=${encodeURIComponent(String(sample))}`
    })
  const queryString = query.length ? `?${query.join('&')}` : ''
  if (base === '' || base === '/') return `${filled}${queryString}`
  return `${base}${filled}${queryString}`
}

export function groupOperations(operations: Operation[]) {
  const byPath = new Map<string, Operation[]>()
  for (const operation of operations) {
    const list = byPath.get(operation.path) ?? []
    list.push(operation)
    byPath.set(operation.path, list)
  }
  return [...byPath.entries()]
}

export function methodLabel(method: string) {
  return method.toUpperCase()
}

export function statusPhrase(status: string) {
  const phrases: Record<string, string> = {
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '204': 'No Content',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '409': 'Conflict',
    '422': 'Unprocessable Entity',
    '429': 'Too Many Requests',
    '500': 'Internal Server Error',
    default: 'Default',
  }
  return phrases[status] ?? ''
}
