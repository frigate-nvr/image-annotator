export interface SuggestedChange {
  label: string
  score?: number
  rejected?: boolean
}

export interface Annotation {
  id: string
  x: number
  y: number
  w: number
  h: number
  label?: string
  difficult?: boolean
  suggestion?: boolean
  // pending label-change suggestion; field name matches the stored
  // attribute so it round-trips through hosts without mapping
  suggested_change?: SuggestedChange
}
