export interface Annotation {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  difficult?: boolean;
  suggestion?: boolean;
}