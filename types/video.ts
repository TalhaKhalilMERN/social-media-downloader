export type PlatformType = 'reelshort' | 'dramabox';

export type FormatSource = 'native' | 'converted';

export interface AnalyzeRequest {
  url: string;
}

export interface NormalizedFormat {
  id: string;
  resolution: string;
  width: number | null;
  height: number | null;
  filesize: number | null;
  source: FormatSource;
}

export interface NormalizedVideoMetadata {
  title: string;
  duration: number | null;
  webpageUrl: string;
  extractor: string;
  thumbnail: string | null;
  width: number | null;
  height: number | null;
  platform: PlatformType;
}

export interface AnalyzeResponse {
  success: boolean;
  platform?: PlatformType;
  video?: NormalizedVideoMetadata;
  formats?: NormalizedFormat[];
  error?: string;
}
