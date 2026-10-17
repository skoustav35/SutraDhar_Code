export interface UpstreamModel {
  id: string
  name: string
  description?: string
  family?: string
  release_date: string
  last_updated?: string
  attachment: boolean
  reasoning: boolean
  temperature: boolean
  tool_call: boolean
  structured_output?: boolean
  open_weights?: boolean
  reasoning_options?: any[]
  interleaved?: any
  cost?: {
    input: number
    output: number
    cache_read?: number
    cache_write?: number
    tiers?: any[]
    context_over_200k?: any
  }
  limit: {
    context: number
    input?: number
    output: number
  }
  modalities?: {
    input: string[]
    output: string[]
  }
  experimental?: any
  status?: "alpha" | "beta" | "deprecated"
  provider?: {
    npm?: string
    api?: string
  }
}

export interface CuratedModelDoc {
  id: string
  enabled: boolean
  disguisedName: string
  disguisedDescription: string
  category: "flagship" | "coding" | "reasoning" | "fast" | "vision" | "general"
  badge: string
  sortOrder: number
  upstreamName: string
  upstreamFamily: string
  upstreamContext: number
  upstreamOutput: number
  reasoning: boolean
  toolCall: boolean
  attachment: boolean
  updatedAt: number
  upstreamRaw?: UpstreamModel
}

export interface AppSettingsDoc {
  providerName: string
  lastSync: number
  syncCount: number
  autoEnableNewModels: boolean
}
