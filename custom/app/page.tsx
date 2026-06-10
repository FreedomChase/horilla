'use client'

import { useState, useRef, useCallback } from 'react'

const SECTIONS = [
  { id: 'rationale',    marker: '### A. Design Rationale',   label: 'A. Design Rationale' },
  { id: 'wireframe',    marker: '### B. Layout Wireframe',    label: 'B. Wireframe' },
  { id: 'components',  marker: '### C. Component Breakdown', label: 'C. Components' },
  { id: 'html',        marker: '### D. Tailwind HTML',       label: 'D. HTML' },
  { id: 'interactions',marker: '### E. Interaction Notes',   label: 'E. Interactions' },
  { id: 'evaluation',  marker: 'SELF-EVALUATION REPORT',     label: 'Self-Evaluation' },
] as const

type SectionId = typeof SECTIONS[number]['id']

function getActiveSections(text: string): Set<string> {
  const active = new Set<string>()
  for (const { id, marker } of SECTIONS) {
    if (text.includes(marker)) active.add(id)
  }
  return active
}

function extractHTML(text: string): string {
  const match = text.match(/```html\n([\s\S]*?)```/)
  return match?.[1]?.trim() ?? ''
}

function scrollToSection(
  sectionId: SectionId,
  output: string,
  containerEl: HTMLElement | null
) {
  if (!containerEl) return
  const marker = SECTIONS.find(s => s.id === sectionId)?.marker
  if (!marker) return
  const idx = output.indexOf(marker)
  if (idx === -1) return
  const linesBefore = output.slice(0, idx).split('\n').length
  containerEl.scrollTop = Math.max(0, linesBefore * 20 - 80)
}

export default function Page() {
  const [brief, setBrief] = useState('')
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const generate = useCallback(async () => {
    if (!brief.trim() || isGenerating) return
    setOutput('')
    setIsGenerating(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const raw = decoder.decode(value, { stream: true })
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            const { text } = JSON.parse(line.slice(6))
            if (text) setOutput(prev => prev + text)
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setOutput(prev => prev + '\n\n[Generation stopped due to an error]')
      }
    } finally {
      setIsGenerating(false)
    }
  }, [brief, isGenerating])

  function stop() {
    abortRef.current?.abort()
    setIsGenerating(false)
  }

  async function copyHTML() {
    const html = extractHTML(output)
    if (!html) return
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const activeSections = getActiveSections(output)
  const hasHTML = output.includes('```html')

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 h-14 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-tight">web-design agent</span>
          <span className="text-[9px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 tracking-widest uppercase">v0.1</span>
        </div>
        {hasHTML && (
          <button
            onClick={copyHTML}
            className="text-xs text-zinc-500 hover:text-zinc-100 transition-colors duration-75"
          >
            {copied ? 'Copied ✓' : 'Copy HTML →'}
          </button>
        )}
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-zinc-900 flex flex-col overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">

            <div className="flex flex-col gap-2">
              <label className="text-[9px] tracking-[0.2em] uppercase text-zinc-600">
                Brief
              </label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
                }}
                placeholder="Describe the site — product, audience, tone, constraints."
                rows={9}
                className="w-full bg-zinc-900 text-[12px] text-zinc-200 placeholder:text-zinc-700 border border-zinc-800 p-3 resize-none focus:outline-none focus:border-zinc-700 transition-colors duration-75 leading-relaxed"
              />
              <p className="text-[9px] text-zinc-700">⌘ Enter to run</p>
            </div>

            <button
              onClick={isGenerating ? stop : generate}
              disabled={!brief.trim() && !isGenerating}
              className="py-2 text-[13px] font-medium transition-colors duration-75 disabled:cursor-not-allowed
                bg-zinc-100 text-zinc-900 hover:bg-zinc-300
                disabled:bg-zinc-900 disabled:text-zinc-700"
            >
              {isGenerating ? '◼  Stop' : 'Generate →'}
            </button>

            {output && (
              <nav className="flex flex-col gap-0.5 pt-2 border-t border-zinc-900">
                <p className="text-[9px] tracking-[0.2em] uppercase text-zinc-600 mb-2">Sections</p>
                {SECTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id, output, outputRef.current)}
                    disabled={!activeSections.has(id)}
                    className={`text-left text-[12px] px-2 py-1 transition-colors duration-75 rounded-sm
                      ${
                        activeSections.has(id)
                          ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                          : 'text-zinc-800 cursor-default'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Output */}
        <main
          ref={outputRef}
          className="flex-1 overflow-y-auto p-8"
        >
          {!output && !isGenerating && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-xs">
                <p className="text-[9px] tracking-[0.2em] uppercase text-zinc-700 mb-3">Ready</p>
                <p className="text-[13px] text-zinc-600 leading-relaxed">
                  Enter a brief in the sidebar. The agent runs its full pipeline — rationale, wireframe, components, production HTML, interactions, and self-evaluation.
                </p>
              </div>
            </div>
          )}

          {isGenerating && !output && (
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="animate-pulse">▊</span>
              <span className="text-[11px] tracking-wide">Thinking...</span>
            </div>
          )}

          {output && (
            <pre className="text-[12.5px] text-zinc-300 whitespace-pre-wrap font-mono leading-[1.65] max-w-3xl">
              {output}
              {isGenerating && (
                <span className="animate-pulse text-zinc-500">▊</span>
              )}
            </pre>
          )}
        </main>
      </div>
    </div>
  )
}
