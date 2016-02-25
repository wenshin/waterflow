import {assert} from 'chai';
import pipeline from '../lib/pipeline';
import PipelineLoggerMiddleware from '../lib/middlewares/logger';
import {makeRoundNumberHandler, toNumberHandler} from '../lib/middlewares/number';

let RoundNumberPipeMiddleware = {
  type: 'pipe',
  name: 'RoundNumberPipeMiddleware',
  post: makeRoundNumberHandler()
};

let ToNumberPipelineMiddleware = {
  type: 'pipeline',
  name: 'ToNumberPipelineMiddleware',
  pre: toNumberHandler
};

describe('pipeline.sync', function () {
  it('应该正确运行非异步方法', function () {
    let except = pipeline('10',
      {
        name: 'pipeline1',
        middlewares: [ToNumberPipelineMiddleware]
      })
      .flow(v => {
        if (typeof v !== 'number') throw new TypeError('not a number');
        return v;
      })
      .flow(v => -v)
      .flow(v => 1/v)
      .finish();
    assert.equal(except, -0.1);
  });

  it('可以正确用 flowMap 处理数据', function () {
    let except = pipeline({1: 10, 2: 20, 3: 30})
    // let except = pipeline({1: 10, 2: 20, 3: 30}, {middlewares: [PipelineLoggerMiddleware]})
      .flowMap({handle: v => 1/v, filter: v => v < 30})
      .flowReduce({
        handle: (pre, cur) => pre + cur,
        initialValue: 0,
        middlewares: [RoundNumberPipeMiddleware]
      })
      .finish();
    assert.equal(except, 0.15);
  });

  // it('应该正确处理异步管道出错', function (done) {});

  it('可以正确执行同步方法 flowMap 和 flowReduce', function () {
    let except = pipeline(10)
    // let except = pipeline(10, {middlewares: [PipelineLoggerMiddleware]})
      .flow(v => [1*v, 2*v, 3*v])
      .flowMap({handle: v => 1/v, filter: v => v < 30})
      .flowReduce({
        handle: (pre, cur) => pre + cur,
        initialValue: 0,
        middlewares: [RoundNumberPipeMiddleware]
      })
      .finish();
    assert.equal(except, 0.15);
  });

  it('可以使用 handles 传递多个处理函数执行 flowMap', function () {
    let except = pipeline(10)
    // let except = pipeline(10, {middlewares: [PipelineLoggerMiddleware]})
      .flow(v => [1*v, 2*v, 3*v])
      .flowMap({handles: [v => 1 / v, v => 1 / v + 1, v => 1 / v + 2], filter: v => v < 30})
      .flowReduce({
        handle: (pre, cur) => pre + cur,
        initialValue: 0,
        middlewares: [RoundNumberPipeMiddleware]
      })
      .finish();
    assert.equal(except, 1.15);
  });

  it('flowMap 的传入数组数据元素个数与 handles 元素个数不一致时，应当取其中元素最多的个数遍历', function () {
    let except = pipeline([10, 20])
    // let except = pipeline([10, 20], {middlewares: [PipelineLoggerMiddleware]})
      .flowMap({
        name: 'Map Test Array Data',
        handles: [v => -v, v => ++v, () => 30],
        filter: v => v < 20
      })
      .flowReduce((p, c) => p + c)
      .finish();

    assert.equal(except, 20);

    except = pipeline({key1: 10, key2: 20})
    // let except = pipeline({key1: 10, key2: 20}, {middlewares: [PipelineLoggerMiddleware]})
      .flowMap({
        name: 'Map Test Object Data',
        handles: {key1: v => -v, key2: v => ++v, key3: () => 30},
        filter: v => v < 20
      })
      .finish();

    assert.deepEqual(except, {key1: -10, key3: 30});
  });

  it('可以在同步方法中正确执行 breakPipeline', function () {
    let except = pipeline(10)
    // let except = pipeline(10, {middlewares: [PipelineLoggerMiddleware]})
      .flow((v, breakPipeline) => {
        breakPipeline();
        return 2 * v;
      })
      .flow({handle: v => 1/v})
      .finish();
    assert.equal(except, 20);
  });

  it('可以在同步方法 flowMap 中正确执行 breakPipeline', function () {

    let except = pipeline([10, 20])
    // let except = pipeline([10, 20], {middlewares: [PipelineLoggerMiddleware]})
      .flowMap((v, i, breakPipeline) => {
        breakPipeline();
        return -v;
      })
      .flowReduce({handle: (pre, cur) => pre + cur})
      .finish();

    assert.sameMembers(except, [-10, -20]);
  });

  it('可以在同步方法 flowReduce 中正确执行 breakPipeline', function () {

    let except = pipeline([10, 20])
    // let except = pipeline([10, 20], {middlewares: [PipelineLoggerMiddleware]})
      .flowReduce({
        handle: (pre, cur, breakPipeline) => {
          breakPipeline();
          return pre + cur;
        },
        initialValue: 0
      })
      .flowMap(v => -v)
      .finish();

    assert.equal(except, 30);
  });
});
