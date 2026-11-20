const pattern = /^(New session|Child session) - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

interface Info {
  readonly title?: string
  readonly parentID?: string
  readonly time: {
    readonly created: number
  }
}

export function withTimestampedFallback(info: Info) {
  const clean = info.title?.trim()
  if (clean) return clean
  return `${info.parentID ? "Child" : "New"} session - ${new Date(info.time.created).toISOString()}`
}

export function sessionTitle(title?: string) {
  const clean = title?.trim()
  if (!clean) return undefined
  const match = clean.match(pattern)
  return match?.[1] ?? clean
}
