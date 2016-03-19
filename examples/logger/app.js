var Pipeline = require('../../dist').default;
var PipelineLogger = require('../../dist/middlewares/logger').default;
var makeRoundNumberHandler = require('../../dist/middlewares/number').makeRoundNumberHandler;

Pipeline.setPipelineMiddlewares([PipelineLogger]);

var RoundNumberPipeMiddleware = {
  type: 'pipe',
  name: 'RoundNumberPipeMiddleware',
  post: makeRoundNumberHandler()
};

var pl = new Pipeline('myPipeline', [
  {name: 'pipe1', handle: v => 1 / v},
  {
    name: '2times',
    type: 'async',
    handle: v => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(v * 2), 50);
      });
    }
  },
  {handle: () => [1, 2, 3]},
  {name: 'map', handle: v => 1/v, filter: v => v < 30, type: 'map'},
  {
    name: 'reduce',
    type: 'reduce',
    handle: (pre, cur) => pre + cur,
    initialValue: 0,
    middlewares: [RoundNumberPipeMiddleware]
  },
  {name: 'plus', handle: v => v + 0.1}
]);

pl.flow(10);
