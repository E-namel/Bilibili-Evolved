import { getJsonWithCredentials } from '@/core/ajax'
import { md5 } from './md5'

// Wbi 签名, 参考 biliscope scripts/biliapi.js 与
// https://github.com/SocialSisterYi/bilibili-API-collect 的 Wbi 签名章节

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28,
  14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54,
  21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

let cachedMixinKey: string | null = null

const getMixinKey = async (): Promise<string> => {
  if (cachedMixinKey) {
    return cachedMixinKey
  }
  const json = await getJsonWithCredentials('https://api.bilibili.com/x/web-interface/nav')
  const wbiImg = json?.data?.wbi_img
  const imgKey = String(wbiImg?.img_url ?? '')
    .split('/')
    .pop()
    ?.split('.')[0]
  const subKey = String(wbiImg?.sub_url ?? '')
    .split('/')
    .pop()
    ?.split('.')[0]
  const raw = `${imgKey ?? ''}${subKey ?? ''}`
  cachedMixinKey = mixinKeyEncTab
    .map(index => raw[index])
    .join('')
    .slice(0, 32)
  return cachedMixinKey
}

export const clearWbiCache = () => {
  cachedMixinKey = null
}

export const signWbiParams = async (params: Record<string, string | number>) => {
  const mixinKey = await getMixinKey()
  const signedParams: Record<string, string | number> = {
    ...params,
    wts: Math.floor(Date.now() / 1000),
  }
  const query = Object.keys(signedParams)
    .sort()
    .map(key => `${key}=${encodeURIComponent(signedParams[key])}`)
    .join('&')
  const wRid = md5(query + mixinKey)
  return `${query}&w_rid=${wRid}`
}
