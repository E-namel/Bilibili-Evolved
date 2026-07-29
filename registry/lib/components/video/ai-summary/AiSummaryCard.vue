<template>
  <div v-show="visible" class="be-ai-summary-card" :class="{ 'is-compact': tip }">
    <template v-if="tip">
      <div class="be-ai-summary-tip">{{ tip }}</div>
    </template>
    <template v-else>
      <div class="be-ai-summary-header">
        <svg
          width="30"
          height="30"
          viewBox="0 0 30 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="be-ai-summary-header-icon"
        >
          <g clip-path="url(#be-ai-summary-clip)">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M7.53976 2.34771C8.17618 1.81736 9.12202 1.90335 9.65237 2.53976L12.1524 5.53976C12.6827 6.17618 12.5967 7.12202 11.9603 7.65237C11.3239 8.18272 10.3781 8.09673 9.84771 7.46031L7.34771 4.46031C6.81736 3.8239 6.90335 2.87805 7.53976 2.34771Z"
              fill="url(#be-ai-summary-paint0)"
            ></path>
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M21.9602 2.34771C21.3238 1.81736 20.378 1.90335 19.8476 2.53976L17.3476 5.53976C16.8173 6.17618 16.9033 7.12202 17.5397 7.65237C18.1761 8.18272 19.1219 8.09673 19.6523 7.46031L22.1524 4.46031C22.6826 3.8239 22.5967 2.87805 21.9602 2.34771Z"
              fill="url(#be-ai-summary-paint1)"
            ></path>
            <g opacity="0.2">
              <path
                d="M27 18.2533C27 25.0206 21.6274 27 15 27C8.37258 27 3 25.0206 3 18.2533C3 11.486 3.92308 6 15 6C26.5385 6 27 11.486 27 18.2533Z"
                fill="#D9D9D9"
              ></path>
            </g>
            <path
              d="M28 18.9489C28 26.656 22.1797 28 15 28C7.8203 28 2 26.656 2 18.9489C2 10 3 6 15 6C27.5 6 28 10 28 18.9489Z"
              fill="url(#be-ai-summary-paint2)"
            ></path>
            <path
              d="M4.78613 14.2091C4.78613 11.9263 6.44484 9.96205 8.71139 9.6903C13.2069 9.1513 16.7678 9.13141 21.3132 9.68091C23.5697 9.95371 25.2147 11.9138 25.2147 14.1868V19.192C25.2147 21.3328 23.7551 23.2258 21.6452 23.5884C16.903 24.4032 13.1705 24.2461 8.55936 23.5137C6.36235 23.1647 4.78613 21.2323 4.78613 19.0078V14.2091Z"
              fill="#191924"
            ></path>
            <path
              d="M19.6426 15.3125L19.6426 18.0982"
              stroke="#2CFFFF"
              stroke-width="2.4"
              stroke-linecap="round"
            ></path>
            <path
              d="M10.3574 14.8516L12.2146 16.7087L10.3574 18.5658"
              stroke="#2CFFFF"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
          </g>
          <defs>
            <linearGradient
              id="be-ai-summary-paint0"
              x1="6.80424"
              y1="2.84927"
              x2="9.01897"
              y2="8.29727"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#393946"></stop>
              <stop offset="0.401159" stop-color="#23232E"></stop>
              <stop offset="1" stop-color="#191924"></stop>
            </linearGradient>
            <linearGradient
              id="be-ai-summary-paint1"
              x1="22.6958"
              y1="2.84927"
              x2="20.481"
              y2="8.29727"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#393946"></stop>
              <stop offset="0.401159" stop-color="#23232E"></stop>
              <stop offset="1" stop-color="#191924"></stop>
            </linearGradient>
            <linearGradient
              id="be-ai-summary-paint2"
              x1="7.67091"
              y1="10.8068"
              x2="20.481"
              y2="29.088"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#F4FCFF"></stop>
              <stop offset="1" stop-color="#EAF5F9"></stop>
            </linearGradient>
            <clipPath id="be-ai-summary-clip">
              <rect width="30" height="30" fill="white"></rect>
            </clipPath>
          </defs>
        </svg>
        <span class="be-ai-summary-header-text">已为你生成视频总结</span>
      </div>
      <div class="be-ai-summary-body">
        <div v-if="summary" class="be-ai-summary-abstracts">{{ summary }}</div>
        <div v-if="outline.length" class="be-ai-summary-outline">
          <div v-for="(section, index) in outline" :key="index" class="be-ai-summary-section">
            <div class="be-ai-summary-section-title" @click="jump(section.timestamp)">
              {{ section.title }}
            </div>
            <div
              v-for="(part, partIndex) in section.part_outline"
              :key="partIndex"
              class="be-ai-summary-bullet"
              @click="jump(part.timestamp)"
            >
              <span class="be-ai-summary-timestamp">{{ formatTime(part.timestamp) }}</span>
              <span class="be-ai-summary-content">{{ part.content }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { AiSummaryOutline } from './api'

export default defineComponent({
  name: 'AiSummaryCard',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    /** 非空时以迷你卡形式展示提示（加载中 / 无总结 / 无权限等） */
    tip: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    outline: {
      type: Array as PropType<AiSummaryOutline[]>,
      default: () => [],
    },
    bvid: {
      type: String,
      default: '',
    },
  },
  methods: {
    jump(timestamp: number) {
      window.open(`https://www.bilibili.com/video/${this.bvid}/?t=${timestamp}`, '_blank')
    },
    formatTime(totalSeconds: number) {
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const paddedMinutes = `${minutes}`.padStart(2, '0')
      const paddedSeconds = `${seconds}`.padStart(2, '0')
      if (hours > 0) {
        return `${hours}:${paddedMinutes}:${paddedSeconds}`
      }
      return `${minutes}:${paddedSeconds}`
    },
  },
})
</script>

<style lang="scss">
.be-ai-summary-card {
  position: absolute;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  width: 375px;
  max-height: 50dvh;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.1);
  color: #18191c;
  font-size: 14px;
  user-select: none;

  body.dark & {
    background-color: var(--be-color-popup-bg, #222);
    color: var(--be-color-text-title, #eee);
  }

  .be-ai-summary-header {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 18px 14px 10px;
    border-radius: 8px 8px 0 0;
    background: linear-gradient(90deg, #fdf0f5 0%, #eef5fd 100%);
    font-weight: 700;

    body.dark & {
      background: rgba(255, 255, 255, 0.04);
    }

    .be-ai-summary-header-icon {
      margin-right: 8px;
    }
  }

  .be-ai-summary-body {
    // 整卡 max-height 生效后由 flex 收缩, min-height: 0 允许收缩出滚动条
    min-height: 0;
    overflow: auto;
    padding: 8px 8px 6px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background: #999;
    }
  }

  .be-ai-summary-tip {
    padding: 8px 10px;
    color: #9499a0;

    body.dark & {
      color: var(--be-color-text-placeholder, #999);
    }
  }

  &.is-compact {
    width: max-content;
    max-width: 320px;

    .be-ai-summary-tip {
      padding: 8px 14px;
    }
  }

  .be-ai-summary-abstracts {
    padding: 8px 10px;
    font-weight: 700;
    user-select: text;
  }

  .be-ai-summary-section {
    padding: 12px 8px;
    line-height: 20px;

    &:hover {
      border-radius: 8px;
      background-color: #f6f7f8;

      body.dark & {
        background-color: rgba(255, 255, 255, 0.06);
      }
    }
  }

  .be-ai-summary-section-title {
    display: flex;
    font-weight: 700;
    cursor: pointer;

    &::before {
      content: '';
      flex-shrink: 0;
      display: block;
      width: 4px;
      height: 4px;
      margin: 8px 12px 8px 6px;
      border-radius: 2px;
      background-color: currentColor;
    }
  }

  .be-ai-summary-bullet {
    display: flex;
    margin-top: 8px;
    margin-left: 22px;
    cursor: pointer;
    transition: color 0.3s;

    &:hover,
    &:hover .be-ai-summary-timestamp {
      color: #00aeec;
    }
  }

  .be-ai-summary-timestamp {
    flex: 0 0 56px;
    font-size: 13px;
    color: #9499a0;
    transition: color 0.3s;

    body.dark & {
      color: var(--be-color-text-placeholder, #999);
    }
  }
}
</style>
