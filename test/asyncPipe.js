import {assert} from 'chai';
import pipeline from '../lib/pipeline';
import {makeRoundNumberHandler} from '../lib/middlewares/number';
import PipelineLoggerMiddleware from '../lib/middlewares/logger';

let RoundNumberPipeMiddleware = {
  type: 'pipe',
  name: 'RoundNumberPipeMiddleware',
  post: makeRoundNumberHandler()
};

let RoundNumberPipelineMiddleware = {
  type: 'pipeline',
  name: 'RoundNumberPipelineMiddleware',
  post: makeRoundNumberHandler()
};

let asyncDelay = 5;
let asyncPipeNegtive = v => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(-v);
    }, asyncDelay);
  });
};
let asyncPipePlus1 = v => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(++v);
    }, asyncDelay);
  });
};
let asyncPipeExtra = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(30);
    }, asyncDelay);
  });
};
let mapFilter = v => v < 20;

describe('pipeline.async', function () {
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

  it('flowMapAsync 的传入 Array 数据元素个数与 handles 元素个数不一致时，应当取其中元素最多的个数遍历', function (done) {
    let promise = pipeline([10, 20])
    // let promise = pipeline([10, 20], {middlewares: [PipelineLoggerMiddleware]})
      .flowMapAsync({
        name: 'Map Async Test',
        handles: [asyncPipeNegtive, asyncPipePlus1, asyncPipeExtra],
        filter: mapFilter
      })
      .flowReduce((p, c) => p + c)
      .finish();

    let except;
    promise.then(data => except = data);

    setTimeout(() => {
      assert.equal(except, 20);
      done();
    }, asyncDelay * 3 + 5);
  });

  it('flowMapAsync 的传入 Object 数据元素个数与 handles 元素个数不一致时，应当取其中元素最多的个数遍历', function (done) {
    let promise = pipeline({key1: 10, key2: 20})
    // let promise = pipeline({key1: 10, key2: 20}, {middlewares: [PipelineLoggerMiddleware]})
      .flowMapAsync({
        name: 'Map Async Test',
        handles: {key1: asyncPipeNegtive, key2: asyncPipePlus1, key3: asyncPipeExtra},
        filter: mapFilter
      })
      .finish();

    let except;
    promise.then(data => except = data);

    setTimeout(() => {
      assert.deepEqual(except, {key1: -10, key3: 30});
      done();
    }, asyncDelay * 3 + 5);
  });

  it('可以在 flowAsync 方法中正确执行 breakPipeline', function (done) {
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

  it('可以在 flowMapAsync 方法中正确执行 breakPipeline', function (done) {
    let async2Times = (data, index, breakPipeline) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          breakPipeline();
          resolve(data * 2 + index);
        }, 10);
      });
    };

    let promise = pipeline([10, 20])
    // let promise = pipeline([10, 20], {middlewares: [PipelineLoggerMiddleware]})
      .flowMapAsync(async2Times)
      .flowMap(v => -v)
      .finish();

    promise.then(data => {
      assert.sameMembers(data, [20, 41]);
      done();
    });
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
    promise.then(data => except = data);
    setTimeout(() => {
      assert.equal(except, 55);
      done();
    }, 30);
  });

  it('可以正确执行有包含失败情况的多个 handler 的 flowMapAsync', function (done) {
    let async2Times = data => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(data * 2);
        }, 10);
      });
    };

    let asyncHalf = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject('half error');
        }, 10);
      });
    };

    let promise = pipeline([10, 20, 30])
    // let promise = pipeline([10, 20, 30], {middlewares: [PipelineLoggerMiddleware]})
      .flowMapAsync({handles: [async2Times, null, asyncHalf]})
      .finish();

    let except;
    promise.then(() => {}, result => except = result);
    setTimeout(() => {
      assert.deepEqual(except.data, {0: 20, 1: 20});
      assert.deepEqual(except.errors, {2: 'half error'});
      done();
    }, 30);
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
    promise.then(data => except = data);
    setTimeout(() => {
      assert.equal(except, 60);
      done();
    }, 30);
  });


});
