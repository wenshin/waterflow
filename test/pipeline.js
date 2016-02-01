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

  it('可以正确用 flowMap 处理对象', function () {
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

  it('可以使用 handles 传递多个处理函数执行 flowMap ', function () {
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
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(data * 2);
        }, 10);
      });
    };

    let asyncHalf = data => {
      return new Promise((resolve) => {
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
      assert.equal(except, 35);
      done();
    }, 30);
  });

});
