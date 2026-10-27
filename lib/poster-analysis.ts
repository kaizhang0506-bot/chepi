import type {AnalysisResult,PosterConfig} from './design-config';
export interface PosterAnalysisRequest {asset_id:string;image:string;config:PosterConfig;}
export interface PosterAnalysisProvider {analyze(request:PosterAnalysisRequest):Promise<AnalysisResult>;}
// Replace this adapter with the platform's real image-analysis endpoint.
export const posterAnalysisProvider:PosterAnalysisProvider={async analyze(){throw new Error('当前尚未接入海报分析服务。可导入真实分析结果，或手动继续设置参数。');}};
