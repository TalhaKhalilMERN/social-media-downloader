export type PlatformType = 'reelshort' | 'dramabox';

export type FormatSource = 'native' | 'generated';

export interface AnalyzeRequest {
  url: string;
}

export interface NormalizedFormat {
  id: string;
  quality: string;
  resolution: string;
  width: number | null;
  height: number | null;
  filesize: number | null;
  filesizeDisplay: string;
  source: FormatSource;
  generatedFrom?: string;
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
