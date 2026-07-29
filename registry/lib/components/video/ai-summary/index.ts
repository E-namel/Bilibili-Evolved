import { defineComponentMetadata } from '@/components/define'
import { ComponentEntry } from '@/components/types'
import { useScopedConsole } from '@/core/utils/log'
import { mountVueComponent } from '@/core/utils'
import { feedsUrls, mainSiteUrls, matchCurrentPage, videoUrls } from '@/core/utils/urls'
import { AiSummaryData, AiSummaryResponse, getAiSummary } from './api'
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

  // 会话级缓存: 成功响应与确定性错误码(未登录/无权限等)都缓存, 网络异常不缓存
  const summaryCache = new Map<string, AiSummaryResponse>()
  let currentBvid = ''
  let currentAnchor: HTMLElement | null = null
  let showTimer = 0
  let hideTimer = 0
  let requestId = 0

  const hideCard = () => {
    card.visible = false
    currentBvid = ''
    currentAnchor = null
  }

  const cardElement = card.$el as HTMLElement

  // 闲置计时: 自最后一次 hover(锚点或卡片)起连续 hideDelay 毫秒无 hover 即隐藏,
  // 不依赖 mouseleave 必定触发, 锚点被 DOM 回收也能自愈
  const armHideTimer = () => {
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => {
      // 鼠标停在锚点/卡片上不产生事件, 用 :hover 兜底, 仍悬停则续命
      if (currentAnchor?.matches(':hover') || cardElement.matches(':hover')) {
        armHideTimer()
      } else {
        hideCard()
      }
    }, Number(settings.options.hideDelay))
  }

  cardElement.addEventListener('mouseenter', armHideTimer)
  cardElement.addEventListener('mouseleave', armHideTimer)

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
    // 垂直方向钳制在视口内(上下留 8px), 配合卡片 max-height 保证整卡可见
    const cardHeight = cardElement.offsetHeight
    const minTop = window.scrollY + 8
    const maxTop = Math.max(window.scrollY + window.innerHeight - cardHeight - 8, minTop)
    const top = Math.min(Math.max(rect.top + window.scrollY, minTop), maxTop)
    cardElement.style.top = `${top}px`
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

  const applyResponse = (bvid: string, response: AiSummaryResponse) => {
    if (response.success === true) {
      applySummary(bvid, response.data)
    } else {
      card.bvid = bvid
      card.tip = describeApiError(response.failure.code)
    }
  }

  const showSummary = async (anchor: HTMLElement, bvid: string) => {
    currentBvid = bvid
    currentAnchor = anchor
    card.visible = true
    card.tip = '加载中…'
    armHideTimer()
    await repositionAfterRender(anchor, bvid)

    const cached = summaryCache.get(bvid)
    if (cached) {
      applyResponse(bvid, cached)
      await repositionAfterRender(anchor, bvid)
      return
    }

    const thisRequest = ++requestId
    try {
      const response = await getAiSummary(bvid)
      // 成功与确定性错误码都进缓存; 网络异常会抛错, 不进缓存
      summaryCache.set(bvid, response)
      if (thisRequest !== requestId || currentBvid !== bvid) {
        return
      }
      applyResponse(bvid, response)
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
    if (!bvid) {
      return
    }
    // hover 锚点即重置闲置倒计时, 包括停留在当前视频上的情况
    armHideTimer()
    if (bvid === currentBvid) {
      return
    }
    logger.debug('matched video link:', bvid, anchor.href)

    window.clearTimeout(showTimer)
    showTimer = window.setTimeout(() => {
      showSummary(anchor, bvid)
    }, Number(settings.options.hoverThreshold))
  })

  // 页面滚动/缩放后锚点位置失效, 直接隐藏卡片, 再次悬停时会命中缓存即时重现
  window.addEventListener(
    'scroll',
    (event: Event) => {
      // 卡片自身内容(提纲列表)的滚动除外
      if (event.target instanceof Node && cardElement.contains(event.target)) {
        return
      }
      hideCard()
    },
    { capture: true, passive: true },
  )
  window.addEventListener('resize', hideCard, { passive: true })

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
