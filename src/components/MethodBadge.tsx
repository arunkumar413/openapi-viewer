import { cn } from '@/lib/utils'
import type { HttpMethod } from '@/lib/openapi'
import { methodLabel } from '@/lib/openapi'

const styles: Record<string, string> = {
  get: 'bg-get-bg text-get',
  post: 'bg-post-bg text-post',
  put: 'bg-put-bg text-put',
  patch: 'bg-patch-bg text-patch',
  delete: 'bg-delete-bg text-delete',
  head: 'bg-other-bg text-other',
  options: 'bg-other-bg text-other',
  trace: 'bg-other-bg text-other',
}

export function MethodBadge({
  method,
  compact = false,
}: {
  method: HttpMethod | string
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-mono font-semibold tracking-wide',
        compact ? 'h-5 min-w-12 px-1.5 text-[10px]' : 'h-6 min-w-14 px-2 text-[11px]',
        styles[method] ?? styles.head,
      )}
    >
      {methodLabel(method)}
    </span>
  )
}
