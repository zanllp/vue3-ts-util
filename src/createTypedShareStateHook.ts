import { getCurrentInstance, reactive, onBeforeUnmount, ComponentInternalInstance, toRef, toRefs } from 'vue'
import type { UnwrapNestedRefs } from '@vue/reactivity'
import { ok } from '.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const record = new WeakMap<any, any>()
/**
 * 生成一个实例内进行状态共享的hook，
 * 如果想导出在模板中使用可以直接
 * @example <ele v-model="state.xxx" />
 * 或者是使用toRefs展开
 * @example in ts:
 * setup() {
 *  { state } = useHookShareState()
 *  return toRefs(state)
 * }
 * @example in vue: <ele v-model="xxx" />
 * @param initState 初始化状态函数
 * @returns hook函数
 */
export const createTypedShareStateHook = <T extends object>(initState: (inst: ComponentInternalInstance) => T) => {
  const useHookShareState = () => {
    const inst = getCurrentInstance()
    ok(inst)
    if (!record.has(inst)) {
      record.set(inst, reactive(initState(inst)))
      onBeforeUnmount(() => {
        record.delete(inst)
      })
    }
    const state = record.get(inst) as UnwrapNestedRefs<T>
    ok(state)
    return {
      state,
      toRefs () {
        return toRefs(state)
      }
    }
  }
  return {
    useHookShareState
  }
}
