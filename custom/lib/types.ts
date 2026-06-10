export interface GenerateRequest {
  brief: string
}

export interface StreamChunk {
  text?: string
  error?: string
}

export interface AgentSection {
  id: string
  marker: string
  label: string
}
