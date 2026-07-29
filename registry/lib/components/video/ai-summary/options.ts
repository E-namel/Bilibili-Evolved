import { defineOptionsMetadata, OptionsOfMetadata } from '@/components/define'

export const options = defineOptionsMetadata({
  hoverThreshold: {
    defaultValue: 800,
    displayName: '悬停触发延迟（毫秒）',
  },
  hideDelay: {
    defaultValue: 3000,
    displayName: '消失延迟（毫秒）',
  },
})

export type Options = OptionsOfMetadata<typeof options>
