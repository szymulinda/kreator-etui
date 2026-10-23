import { PhoneModel, CaseColor, StyleOption, FontOption } from '@/config/phoneModels';

export type { PhoneModel, CaseColor, StyleOption, FontOption };

export interface GraphicTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface TextItem {
  id: string;
  text: string;
  fontId: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  rotation: number;
}

export interface CaseCustomizationState {
  model: PhoneModel;
  color: CaseColor;
  graphicUrl: string | null;
  graphicTransform: GraphicTransform;
  textItem: TextItem | null;
  generationCount: number;
  maxGenerations: number;
  isExampleMode?: boolean;
}

export interface GeneratedProposal {
  id: string;
  url: string;
  prompt: string;
  styleId: string;
  model: string;
  timestamp: number;
  isExampleMode?: boolean;
}

export interface GenerateApiResponse {
  success: boolean;
  images: Array<{
    url: string;
    revisedPrompt?: string;
  }>;
  engine: 'cloudflare' | 'fal' | 'openai' | 'demo-fallback';
  modelUsed: string;
  costEstimatedUsd: number;
  remainingGenerations?: number;
  isExampleMode?: boolean;
  error?: string;
  details?: string;
  generationTimeMs?: number;
}
