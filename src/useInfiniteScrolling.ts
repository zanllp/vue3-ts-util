import { ComponentInternalInstance, onBeforeMount, onMounted, Ref } from 'vue'
import { makeAsyncIterator, truthy, useWatchDocument } from '.'
import { PageCursor } from './typedef'

type InfiniteScrollingReachBottomOptions = {
  type: 'reach-bottom'
  threshold?: number
}
type InfiniteScrollingIntersectionOptions = {
  type: 'intersection'
  /**
   * 触发器dom
   */
  target?: Ref<HTMLElement | undefined>,
  /**
   * 监控根元素，没有就是document的viewport
   */
  root?: Ref<HTMLElement | undefined>
}

export type InfiniteScrollingOptions = InfiniteScrollingReachBottomOptions | InfiniteScrollingIntersectionOptions

const isElement = (el: any): el is Element => typeof el?.tagName === 'string'

export const useInfiniteScrolling = <T extends { cursor: PageCursor }, R extends any[]>
  (resFetch: (cursor: string) => Promise<T>, resp2res: (resp: T) => R, opt: InfiniteScrollingOptions) => {
  const iter = makeAsyncIterator(resFetch, resp2res, { dataUpdateStrategy: 'merge' })
  let io: IntersectionObserver | null = null

  if (opt.type === 'reach-bottom') {
    useWatchDocument('scroll', () => {
      const requiredHeight = window.scrollY + window.innerHeight + (opt.threshold ?? 500)
      const currheight = document.body.getBoundingClientRect().height
      if (requiredHeight >= currheight) {
        iter.next()
      }
    })
  } else if (opt.type === 'intersection') {
    io = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting) {
        iter.next()
      }
    }, {
      root: opt.root?.value
    })
  }

  onMounted(() => {
    iter.next()
    if (opt.type === 'intersection' && opt.target?.value) {
      io?.observe(truthy(opt.target?.value))
    }
  })

  onBeforeMount(() => {
    io?.disconnect()
  })

  return {
    ...iter,
    /**
     * 用于进行动态添加监视目标
     */
    obverse (ref: Element | ComponentInternalInstance | null) {
      if (isElement(ref)) {
        io?.observe(ref)
      }
    }
  }
}
