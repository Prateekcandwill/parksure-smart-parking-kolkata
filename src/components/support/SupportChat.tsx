import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, CornerDownLeft, MessageCircle, RotateCcw, Send, Sparkles, UserRound } from 'lucide-react'
import type { Role } from '@/types'
import { useDB } from '@/api/useDB'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthStore } from '@/store/auth'
import {
  askSupport,
  buildSupportContext,
  contextSummary,
  starterPrompts,
  type SupportAnswer,
  type SupportContext,
  type SupportSuggestion,
} from '@/api/support'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { uid } from '@/utils/id'
import { haptic } from '@/utils/haptics'
import { cn } from '@/utils/cn'

interface ChatMessage {
  id: string
  from: 'user' | 'assistant'
  text: string
  suggestions?: SupportSuggestion[]
  topic?: string
  confidence?: number
}

interface SupportChatProps {
  role: Role
  variant?: 'page' | 'sheet'
  className?: string
}

function answerToMessage(answer: SupportAnswer): ChatMessage {
  return {
    id: uid('msg'),
    from: 'assistant',
    text: answer.text,
    suggestions: answer.suggestions,
    topic: answer.topic,
    confidence: answer.confidence,
  }
}

export function SupportChat({ role, variant = 'page', className }: SupportChatProps) {
  const db = useDB()
  const user = useCurrentUser()
  const activeRole = useAuthStore((state) => state.activeRole)
  const context: SupportContext = buildSupportContext(user, activeRole ?? role, db)

  const [messages, setMessages] = useState<ChatMessage[]>(() => [answerToMessage(askSupport('', context))])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, thinking])

  const send = (raw: string) => {
    const question = raw.trim()
    if (!question || thinking) return

    haptic('tap')
    setDraft('')
    setMessages((current) => [...current, { id: uid('msg'), from: 'user', text: question }])
    setThinking(true)

    const answer = askSupport(question, context)
    timer.current = window.setTimeout(() => {
      setMessages((current) => [...current, answerToMessage(answer)])
      setThinking(false)
    }, 320)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    send(draft)
  }

  const reset = () => {
    window.clearTimeout(timer.current)
    setThinking(false)
    setDraft('')
    setMessages([answerToMessage(askSupport('', context))])
    haptic('tap')
  }

  const latest = [...messages].reverse().find((message) => message.from === 'assistant')
  const suggestions = latest?.suggestions ?? starterPrompts[activeRole ?? role] ?? []
  const isSheet = variant === 'sheet'

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col',
        isSheet
          ? 'h-[calc(92dvh-190px)]'
          : 'h-[min(70vh,640px)] rounded-3xl border border-line/80 bg-surface/50 p-3 sm:p-4',
        className,
      )}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-line/70 bg-raised/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-success/25 bg-success/10 text-success">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Live context</div>
            <div className="truncate text-[11px] font-semibold text-text">{contextSummary(context)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="focus-ring inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line/80 bg-surface/70 px-2.5 text-[11px] font-semibold text-muted transition-colors hover:text-text"
          aria-label="Start a new conversation"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="ParkSure Assist conversation"
        className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-2 pr-1"
      >
        {messages.map((message) => {
          const mine = message.from === 'user'
          return (
            <div key={message.id} className={cn('flex items-start gap-2.5', mine && 'flex-row-reverse')}>
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                  mine
                    ? 'border-accent/25 bg-accent/10 text-accent'
                    : 'border-line/80 bg-raised text-success',
                )}
                aria-hidden="true"
              >
                {mine ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div
                className={cn(
                  'max-w-[86%] rounded-2xl border px-3.5 py-2.5 text-[12px] leading-relaxed',
                  mine
                    ? 'border-accent/25 bg-accent/12 text-text'
                    : 'border-line/80 bg-raised/60 text-text',
                )}
              >
                <p className="whitespace-pre-line">{message.text}</p>
                {!mine && message.confidence !== undefined ? (
                  <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {message.topic === 'fallback'
                      ? 'Best local match'
                      : `On-device answer · ${Math.round(message.confidence)}% match`}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}

        {thinking ? (
          <div className="flex items-center gap-2.5" aria-label="ParkSure Assist is typing">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/80 bg-raised text-success">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-2xl border border-line/80 bg-raised/60 px-4 py-3">
              <span className="h-1.5 w-1.5 animate-typing rounded-full bg-muted [animation-delay:-240ms]" />
              <span className="h-1.5 w-1.5 animate-typing rounded-full bg-muted [animation-delay:-120ms]" />
              <span className="h-1.5 w-1.5 animate-typing rounded-full bg-muted" />
            </span>
          </div>
        ) : null}
      </div>

      {suggestions.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-2 py-2" aria-label="Suggested questions">
          {suggestions.slice(0, 4).map((suggestion) => (
            <Chip
              key={suggestion.prompt}
              onClick={() => send(suggestion.prompt)}
              className="min-h-9 px-3 text-[11px]"
              disabled={thinking}
            >
              {suggestion.label}
            </Chip>
          ))}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-1 flex shrink-0 items-end gap-2">
        <label htmlFor={`support-input-${variant}`} className="sr-only">
          Ask ParkSure Assist a question
        </label>
        <div className="relative flex-1">
          <MessageCircle
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id={`support-input-${variant}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about bookings, prices, payments…"
            autoComplete="off"
            maxLength={280}
            className="inset-field h-12 w-full rounded-2xl pl-10 pr-3 text-sm text-text placeholder:text-muted/80 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <Button
          type="submit"
          size="icon"
          className="h-12 w-12 shrink-0"
          disabled={draft.trim().length === 0 || thinking}
          aria-label="Send question"
          iconLeft={<Send className="h-4 w-4" />}
        />
      </form>

      <p className="mt-2 flex shrink-0 items-center gap-1.5 text-[10px] leading-relaxed text-muted">
        <CornerDownLeft className="h-3 w-3 shrink-0" aria-hidden="true" />
        On-device assistant · built-in help library + live demo state. Nothing is sent to an external AI.
      </p>
    </div>
  )
}
