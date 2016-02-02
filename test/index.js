import {assert} from 'chai';
import Pipeline from '../lib';
// test reference pipeline
import {pipeline as _pipeline} from '../lib'; // eslint-disable-line no-unused-vars
import PipelineLogger from '../lib/middlewares/logger';

describe('Pipeline', function () {
  it('应该正确运行委托自 Array 的方法', function (done) {
    let pipeline = new Pipeline(
      'Pipeline Array test',
      [
        {name: 'pipe1', handle: v => v},
        {name: 'Negative', handle: v => -v}
      ]
    );

    assert.equal(pipeline.flow(10), -10);

    pipeline.push({name: 'MultiplicativeInverse', handle: v => 1 / v});

    assert.equal(pipeline.flow(10), -0.1);

    pipeline.push({
      name: 'async',
      type: 'async',
      handle(v) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(v * 2), 10);
        });
      }
    });

    pipeline.flow(10)
      .then(data => {
        assert.equal(data, -0.2);
        done();
      });
  });

  it('应该正确运行 Logger 中间件', function () {
    let pipeline = new Pipeline(
      'Pipeline Logger test',
      [
        {name: 'pipe1', handle: v => v},
        {name: 'Negative', handle: v => -v}
      ]
    );
    Pipeline.setPipelineMiddlewares([PipelineLogger]);
    assert.equal(pipeline.flow(10), -10);
    Pipeline.setPipelineMiddlewares();
  });

  it('应该不运行 Logger 中间件，当设置 settings.logging 为 false', function () {
    let pipeline = new Pipeline(
      'Pipeline Logger test',
      [
        {name: 'pipe1', handle: v => v},
        {name: 'Negative', handle: v => -v}
      ]
    );
    Pipeline.setPipelineMiddlewares([PipelineLogger]);
    assert.equal(pipeline.flow(10, {logging: false}), -10);
    Pipeline.setPipelineMiddlewares();
  });

});
