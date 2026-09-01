export interface AnalyzeRequest {
  url: string;
}

export interface NormalizedFormat {
  formatId: string;
  extension: string;
  width: number | null;
  height: number | null;
  resolution: string;
  videoCodec: string;
  audioCodec: string;
  protocol: string;
  filesize?: number | null;
}

export interface NormalizedVideoMetadata {
  title: string;
  duration: number | null;
  webpageUrl: string;
  extractor: string;
  thumbnail: string | null;
  width: number | null;
  height: number | null;
}

export interface AnalyzeResponse {
  success: boolean;
  video?: NormalizedVideoMetadata;
  formats?: NormalizedFormat[];
  error?: string;
}
