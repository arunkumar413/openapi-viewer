import { FileUp, Link2, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'

export function LoadSpec({
  open,
  onClose,
  onLoadText,
  onLoadUrl,
  error,
  loading,
}: {
  open: boolean
  onClose: () => void
  onLoadText: (text: string) => void
  onLoadUrl: (url: string) => void
  error: string | null
  loading: boolean
}) {
  const [tab, setTab] = useState<'file' | 'url' | 'paste'>('file')
  const [url, setUrl] = useState('')
  const [paste, setPaste] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function onFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onLoadText(reader.result)
    }
    reader.readAsText(file)
  }

  function submitUrl(event: FormEvent) {
    event.preventDefault()
    if (url.trim()) onLoadUrl(url.trim())
  }

  function submitPaste(event: FormEvent) {
    event.preventDefault()
    onLoadText(paste)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-labelledby="load-spec-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-panel shadow-xl sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="load-spec-title" className="text-base font-semibold">
            Open an API document
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-line"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-line px-5 pt-3">
          {(['file', 'url', 'paste'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 pb-2 text-sm capitalize ${
                tab === id
                  ? 'border-b-2 border-accent font-medium text-ink'
                  : 'text-ink-muted'
              }`}
            >
              {id === 'url' ? 'URL' : id}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {error ? (
            <p className="mb-3 rounded-md bg-delete-bg px-3 py-2 text-sm text-delete">
              {error}
            </p>
          ) : null}

          {tab === 'file' ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">
                Choose an OpenAPI 3 or Swagger 2 file in JSON or YAML.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.yaml,.yml,application/json,text/yaml"
                className="hidden"
                onChange={(event) => onFile(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="size-4" />
                Choose file
              </Button>
            </div>
          ) : null}

          {tab === 'url' ? (
            <form className="space-y-3" onSubmit={submitUrl}>
              <p className="text-sm text-ink-muted">
                Fetch a public OpenAPI URL. If the host blocks the browser
                (CORS), download the file and open it instead.
              </p>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/openapi.yaml"
                className="h-9 w-full rounded-md border border-line bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
              />
              <Button type="submit" disabled={loading}>
                <Link2 className="size-4" />
                {loading ? 'Loading…' : 'Fetch document'}
              </Button>
            </form>
          ) : null}

          {tab === 'paste' ? (
            <form className="space-y-3" onSubmit={submitPaste}>
              <textarea
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
                placeholder="Paste OpenAPI JSON or YAML"
                rows={10}
                className="w-full rounded-md border border-line bg-paper p-3 font-mono text-[13px] outline-none focus:border-accent"
              />
              <Button type="submit">Parse document</Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
