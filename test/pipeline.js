import {assert} from 'chai';
import pipeline from '../lib/pipeline';
import PipelineLoggerMiddleware from '../lib/middlewares/logger';
import {makeRoundNumberHandler, toNumberHandler} from '../lib/middlewares/number';

let RoundNumberPipelineMiddleware = {
  type: 'pipeline',
  name: 'RoundNumberPipelineMiddleware',
  post: makeRoundNumberHandler()
};

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


describe('pipeline', function () {
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

  it('应该正确运行异步方法', function (done) {
    let asyncPipe = data => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data * 2);
        }, 10);
      });
    };
    let promise = pipeline(10,
      {
        name: 'pipeline2',
        middlewares: [RoundNumberPipelineMiddleware]
        // middlewares: [RoundNumberPipelineMiddleware, PipelineLoggerMiddleware]
      })
      .flow(v => -v)
      .flowAsync(asyncPipe)
      .flow(v => 1/v)
      .flowAsync(asyncPipe)
      .flow(v => v * 3)
      .finish();
    assert.ok(promise instanceof Promise, '异步结果返回 Promise 对象');

    let except;
    promise
      .then(data => {
        except = data;
      });
    setTimeout(() => {
      assert.equal(except, -0.3);
      done();
    }, 30);
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

  it('flowMapAsync 的传入数组数据元素个数与 handles 元素个数不一致时，应当取其中元素最多的个数遍历', function (done) {
    let delay = 5;
    // let promise = pipeline([10, 20])
    let promise = pipeline([10, 20], {middlewares: [PipelineLoggerMiddleware]})
      .flowMapAsync({
        name: 'Map Async Test',
        handles: [
          v => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(-v);
              }, delay);
            });
          },
          v => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(++v);
              }, delay);
            });
          },
          () => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(30);
              }, delay);
            });
          }
        ],
        filter: v => v < 20
      })
      .flowReduce((p, c) => p + c)
      .finish();

    let except;
    promise
      .then(data => {
        except = data;
      });

    setTimeout(() => {
      assert.equal(except, 20);
      done();
    }, delay * 3 + 5);
  });

  it('可以正确执行只有一个 handler 的 flowMapAsync', function (done) {
    let asyncPipe = data => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data * 2);
        }, 10);
      });
    };

    let promise = pipeline([10, 20, 30])
    // let promise = pipeline([10, 20, 30], {middlewares: [PipelineLoggerMiddleware]})
      .flowMapAsync({handle: asyncPipe, filter: v => v < 30})
      .flowReduce({
        handle: (pre, cur) => pre + cur,
        initialValue: 0,
        middlewares: [RoundNumberPipeMiddleware]
      })
      .finish();

    let except;
    promise
      .then(data => {
        except = data;
      });

    setTimeout(() => {
      assert.equal(except, 60);
      done();
    }, 30);
  });

  it('可以正确执行有多个 handler 的 flowMapAsync', function (done) {
    let async2Times = data => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(data * 2);
        }, 10);
      });
    };

    let asyncHalf = data => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(data * 0.5);
        }, 10);
      });
    };

    let promise = pipeline([10, 20, 30])
    // let promise = pipeline([10, 20, 30], {middlewares: [PipelineLoggerMiddleware]})
      .flowMapAsync({handles: [async2Times, null, asyncHalf]})
      .flowReduce({
        handle: (pre, cur) => pre + cur,
        initialValue: 0,
        middlewares: [RoundNumberPipeMiddleware]
      })
      .finish();

    let except;
    promise
      .then(data => {
        except = data;
      });
    setTimeout(() => {
      assert.equal(except, 55);
      done();
    }, 30);
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

  it('可以在异步方法中正确执行 breakPipeline', function (done) {
    let async2Times = (data, breakPipeline) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          breakPipeline();
          resolve(data * 2);
        }, 10);
      });
    };

    let promise = pipeline(10)
    // let promise = pipeline(10, {middlewares: [PipelineLoggerMiddleware]})
      .flow(v => -v)
      .flowAsync(async2Times)
      .flow({handle: v => 1/v})
      .finish();

    promise.then(data => {
      assert.equal(data, -20);
      done();
    });
  });

  it('可以在同步方法 flowMap 中正确执行 breakPipeline', function () {

    let except = pipeline([10, 20])
    // let except = pipeline([10, 20], {middlewares: [PipelineLoggerMiddleware]})
      .flowMap((v, breakPipeline) => {
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
