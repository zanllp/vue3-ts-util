import { makeAsyncIterator } from '../src'
import { pagedResourceTestEnv } from './pagedTestEnv'


describe('makeAsyncIterator', () => {
  it('资源迭代获取', async () => {
    const { fetchRes } = pagedResourceTestEnv(3) // 创建一个3页的mock资源
    const { res, next, load } = makeAsyncIterator(fetchRes, resp => resp.val)
    expect(res.value).toBeFalsy()
    expect(await next()).toBeTruthy() // 可以正常迭代，返回true表示成功
    expect(res.value).toBe(0)
    expect(await next()).toBeTruthy() // 可以正常迭代，返回true表示成功
    expect(res.value).toBe(1)
    expect(await next()).toBeTruthy() // 可以正常迭代，返回true表示成功
    expect(res.value).toBe(2)
    expect(load.value).toBeTruthy() // 全部加载完成
    expect(await next()).toBeFalsy() // 已经到了最后一页，迭代失败，返回false
    expect(res.value).toBe(2) // 值不变
  })

  it('迭代中loading状态改变且互斥', async () => {
    const { fetchRes } = pagedResourceTestEnv(3, 100) // 创建一个3页的mock资源
    const { next, loading } = makeAsyncIterator(fetchRes, resp => resp.val)
    expect(loading.value).toBeFalsy() // 状态发生改变
    const firstIter = next() // 进行迭代
    expect(loading.value).toBeTruthy() // 状态发生改变
    expect(await next()).toBeFalsy() // 迭代失败， mutex，无法同时进行两个迭代，返回一个false
    await firstIter // 等待首次迭代完成
    expect(loading.value).toBeFalsy() // 迭代完成， loading变回去
  })

  it('使用next进行随机访问', async () => {
    const { fetchRes, mockRes } = pagedResourceTestEnv()
    const { next, iter, res } = makeAsyncIterator(fetchRes, resp => resp.val)
    for await (const _ of iter) { // 直接一次性迭代出所有资源, 随机范围只能在获取到的范围内
    }
    expect(await next(2)).toBeTruthy() // 随机访问第2页的资源
    expect(res.value).toBe(mockRes[2].val)
    expect(await next(5)).toBeTruthy() // 随机访问第5页的资源
    expect(res.value).toBe(mockRes[5].val)
    expect(await next(9)).toBeTruthy() // 随机访问第9页的资源
    expect(res.value).toBe(mockRes[9].val)
    expect(await next(999)).toBeFalsy() // 尝试访问一个不存在或者未知的资源会返回操作错误
  })

  it('使用reset进行单控制器多资源的管理', async () => {
    const resEnvSet = Array.from({ length: 3 }).map(() => pagedResourceTestEnv())
    let resEnvIdx = 0
    const { next, reset, res } = makeAsyncIterator(cur => resEnvSet[resEnvIdx].fetchRes(cur), resp => resp.val)
    expect(await next()).toBeTruthy()
    expect(res.value).toBe(0)
    resEnvIdx = 2 // 切向另外一种资源的获取
    await expect(next()).rejects.toThrow() // 直接迭代 服务器返回一个错误，因为不同资源的curosr增长序列不一样
    reset() // 正确办法是重置，让cursor序列重新增长
    expect(await next()).toBeTruthy()
    expect(res.value).toBe(0)
  })

  it('持续使用随机访问获取下一页迭代, (模拟antd分页器的翻页行为)', async () => {
    const { fetchRes } = pagedResourceTestEnv(5)
    const { next, load, res } = makeAsyncIterator(fetchRes, resp => resp.val)
    const resSet = new Array<any>()
    while (!load.value) {
      expect(await next(resSet.length)).toBeTruthy()
      resSet.push(res.value)
    }
  })
})
