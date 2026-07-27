import { BilibiliApiResponse, bilibiliApi, getJsonWithCredentials } from '@/core/ajax'
import { clearWbiCache, signWbiParams } from './wbi'

export interface AiSummaryPartOutline {
  timestamp: number
  content: string
}

export interface AiSummaryOutline {
  title: string
  timestamp: number
  part_outline: AiSummaryPartOutline[]
}

export interface AiSummaryModelResult {
  /** 0: 没有摘要, 1: 仅有摘要, 2: 摘要 + 提纲 */
  result_type: number
  summary?: string
  outline?: AiSummaryOutline[]
}

export interface AiSummaryData {
  /** -1: 不支持 AI 摘要, 0: 有摘要, 1: 无摘要（未识别到语音） */
  code: number
  model_result?: AiSummaryModelResult
  stid?: string
}

interface VideoViewData {
  cid: number
  owner: {
    mid: number
  }
}

const getVideoBaseInfo = async (bvid: string): Promise<VideoViewData> => {
  const data = await bilibiliApi(
    getJsonWithCredentials(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`),
    '获取视频信息失败',
  )
  return data as VideoViewData
}

export interface AiSummaryFailure {
  code: number
  message: string
}

export type AiSummaryResponse =
  | { success: true; data: AiSummaryData }
  | { success: false; failure: AiSummaryFailure }

export const getAiSummary = async (bvid: string): Promise<AiSummaryResponse> => {
  const { cid, owner } = await getVideoBaseInfo(bvid)
  const request = async () => {
    const query = await signWbiParams({ bvid, cid, up_mid: owner.mid })
    const json = (await getJsonWithCredentials(
      `https://api.bilibili.com/x/web-interface/view/conclusion/get?${query}`,
    )) as BilibiliApiResponse
    return json
  }
  let json = await request()
  if (json.code === -403) {
    // mixin key 可能已过期, 清空缓存重试一次
    clearWbiCache()
    json = await request()
  }
  if (json.code !== 0) {
    return {
      success: false,
      failure: { code: json.code, message: json.message ?? json.msg ?? '' },
    }
  }
  return { success: true, data: json.data as AiSummaryData }
}
