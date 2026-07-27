import { defineComponentMetadata } from '@/components/define'
import { ComponentEntry } from '@/components/types'
import { useScopedConsole } from '@/core/utils/log'
import { mountVueComponent } from '@/core/utils'
import { feedsUrls, mainSiteUrls, matchCurrentPage, videoUrls } from '@/core/utils/urls'
import { AiSummaryData, getAiSummary } from './api'
import { Options, options } from './options'

export const name = 'aiSummary'
export const displayName = 'AI 视频总结'

const logger = useScopedConsole(name)
const author = [
  {
    name: 'E-namel',
    link: 'https://github.com/E-namel',
  },
]
const bvidPattern = /\/video\/(BV[0-9A-Za-z]+)/

interface AiSummaryCardInstance extends Vue {
  visible: boolean
  tip: string
  summary: string
  outline: unknown[]
  bvid: string
}

const describeApiError = (code: number) => {
  switch (code) {
    case -101:
      return '登录后可查看 AI 总结'
    case -403:
      return '没有权限查看此视频的 AI 总结'
    default:
      return `获取 AI 总结失败（${code}）`
  }
}

const entry: ComponentEntry<Options> = async ({ settings }) => {
  const cardModule = await import('./AiSummaryCard.vue')
  const card = mountVueComponent(cardModule) as AiSummaryCardInstance
  document.body.appendChild(card.$el)

  const summaryCache = new Map<string, AiSummaryData>()
  let currentBvid = ''
  let showTimer = 0
  let hideTimer = 0
  let requestId = 0

  const cancelHide = () => window.clearTimeout(hideTimer)
  const scheduleHide = () => {
    hideTimer = window.setTimeout(() => {
      card.visible = false
      currentBvid = ''
    }, 400)
  }

  const cardElement = card.$el as HTMLElement
  cardElement.addEventListener('mouseenter', cancelHide)
  cardElement.addEventListener('mouseleave', scheduleHide)

  const updatePosition = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect()
    const cardWidth = cardElement.offsetWidth || 375
    // 动态页为三栏布局, 弹窗首选左侧, 避免遮挡右侧推荐栏
    const preferLeft = matchCurrentPage(feedsUrls)
    let left: number
    if (preferLeft) {
      left = rect.left - cardWidth - 8 + window.scrollX
      if (left < window.scrollX + 8) {
        left = rect.right + 8 + window.scrollX
      }
    } else {
      left = rect.right + 8 + window.scrollX
      if (rect.right + 8 + cardWidth > window.innerWidth) {
        left = rect.left - cardWidth - 8 + window.scrollX
      }
    }
    cardElement.style.left = `${Math.max(left, window.scrollX + 8)}px`
    cardElement.style.top = `${rect.top + window.scrollY}px`
  }

  // 卡片宽度随内容变化, 内容更新后需等渲染完成再重新定位
  const repositionAfterRender = async (anchor: HTMLElement, bvid: string) => {
    await card.$nextTick()
    if (currentBvid === bvid && card.visible) {
      updatePosition(anchor)
    }
  }

  const applySummary = (bvid: string, data: AiSummaryData) => {
    card.bvid = bvid
    const modelResult = data.model_result
    if (data.code === 0 && modelResult && modelResult.result_type !== 0) {
      card.tip = ''
      card.summary = modelResult.summary ?? ''
      card.outline = modelResult.outline ?? []
    } else {
      card.tip = '此视频没有 AI 总结'
    }
  }

  const showSummary = async (anchor: HTMLElement, bvid: string) => {
    currentBvid = bvid
    card.visible = true
    card.tip = '加载中…'
    await repositionAfterRender(anchor, bvid)

    const cached = summaryCache.get(bvid)
    if (cached) {
      applySummary(bvid, cached)
      await repositionAfterRender(anchor, bvid)
      return
    }

    const thisRequest = ++requestId
    try {
      const response = await getAiSummary(bvid)
      if (thisRequest !== requestId || currentBvid !== bvid) {
        return
      }
      if (response.success === true) {
        summaryCache.set(bvid, response.data)
        applySummary(bvid, response.data)
      } else {
        card.tip = describeApiError(response.failure.code)
      }
    } catch (error) {
      logger.warn('获取 AI 总结请求失败:', error)
      if (thisRequest === requestId && currentBvid === bvid) {
        card.tip = '获取 AI 总结失败'
      }
    }
    await repositionAfterRender(anchor, bvid)
  }

  document.addEventListener('mouseover', (event: MouseEvent) => {
    const anchor = (event.target as HTMLElement).closest?.(
      'a[href*="/video/BV"]',
    ) as HTMLAnchorElement | null
    if (!anchor) {
      return
    }
    const bvid = anchor.href.match(bvidPattern)?.[1]
    if (!bvid || bvid === currentBvid) {
      return
    }
    logger.debug('matched video link:', bvid, anchor.href)

    cancelHide()
    window.clearTimeout(showTimer)
    showTimer = window.setTimeout(() => {
      anchor.addEventListener('mouseleave', scheduleHide, { once: true })
      showSummary(anchor, bvid)
    }, Number(settings.options.hoverThreshold))
  })

  logger.debug('component loaded')
}

export const component = defineComponentMetadata({
  name,
  displayName,
  author,
  tags: [componentsTags.video],
  entry,
  urlInclude: [...mainSiteUrls, ...feedsUrls, ...videoUrls],
  options,
})
