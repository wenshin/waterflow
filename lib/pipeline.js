import utils from './utils';
import {runMiddlewares} from './middleware';
import {preparePipe, resetPipeState, execAllSyncPipe, execAsyncPipe} from './pipe';

/**
 * 生成一个处理数据的 Pipeline 包装
 *
 * @param  {AnyType} value               待处理的值
 *
 * @param  {String}  config.name         名称
 * @param  {Boolean} config.verbose      是否打印日志
 * @param  {Array}   config.middlewares  中间件
 *
 * @return {Object}
 *     一个包含 flow、flowAsync、flowMap、flowReduce 和 finish 属性的对象，属性均为函数。
 */
export default function pipeline (_input, {
                                        name: _pipelineName='',
                                        middlewares: _pipelineMiddlewares=[]
                                      }={}) {
  let _outputState = {
    name: _pipelineName,
    value: _input,
    pipe: utils.pass,
    skip: false,
    middlewareStack: []
  };

  let _commonPipeMiddlewares = [];
  _outputState = runMiddlewares(
    _pipelineMiddlewares, _outputState, 'pre',
    middleware => {
      middleware.pipeMiddleware && _commonPipeMiddlewares.push(middleware.pipeMiddleware);
    }
  );

  let _pipeCount = 0;
  // 执行异步 Pipe 时设置为 true
  let _blocking = false;
  // 异步 Pipe 队列。当 Pipe 执行完成后才会从队列中移除
  let _asyncPipeQueue = [/*{name, pipe}*/];
  // 异步 Pipe 之后的同步 Pipe 队列
  let _syncPipesAfterAsync = new Map(); // {[Async{name, pipe}] => [Sync{name, pipe}]}

  let _handleSuccFinish = utils.noop;
  let _handleErrFinish = utils.noop;

  let pipelineInstance = {
    /**
     * 同步执行函数
     * @param  {Object} pipe
     *     ```
     *     {name, handle, middlewares}
     *     ```
     * @return {[type]}         [description]
     */
    flow(pipe) {
      pipe = _preparePipe(pipe, 'flow');
      _addSyncPipe(pipe);
      return pipelineInstance;
    },

    flowAsync(pipe) {
      pipe = _preparePipe(pipe, 'flowAsync');
      _addAsyncPipe(pipe);
      return pipelineInstance;
    },

    /**
     * @param  {Object} pipe
     *     ```
     *     {name, handle[function], handles[function array], filter, middlewares}
     *     ```
     *     filter 接受和 Array.map 相同的参数，返回 false 代表该数据会被丢弃
     * @return {Object}         pipelineInstance
     */
    flowMap(pipe) {
      pipe = _preparePipe(pipe, 'flowMap');
      pipe.type = 'map';
      _addSyncPipe(pipe);
      return pipelineInstance;
    },

    flowMapAsync(pipe) {
      pipe = _preparePipe(pipe, 'flowMapAsync');
      pipe.type = 'map-async';
      _addAsyncPipe(pipe);
      return pipelineInstance;
    },

    /**
     * @param  {Object} pipe
     *     ```
     *     {name, handle, initialValue, middlewares}
     *     ```
     *     handle, initialValue 分别对应 Array.reduce(callback[, initialValue]) 的参数
     * @return {Object}         pipelineInstance
     */
    flowReduce(pipe) {
      pipe = _preparePipe(pipe, 'flowReduce');
      pipe.type = 'reduce';
      _addSyncPipe(pipe);
      return pipelineInstance;
    },

    finish() {
      if (_blocking || _asyncPipeQueue.length) {
        return new Promise((resolve, reject) => {
          _handleSuccFinish = output => {
            resolve(finishSuccess(output).value);
          };
          _handleErrFinish = err => {
            reject(err);
          };
        });
      } else {
        return finishSuccess(_outputState).value;
      }

      function finishSuccess(state) {
        state = resetPipeState(state);
        return runMiddlewares(_pipelineMiddlewares, state, 'post');
      }
    }
  };

  function _preparePipe(pipe, type) {
    let newPipe = preparePipe(pipe, type, _commonPipeMiddlewares);
    let order = ++_pipeCount;
    newPipe.order = order;
    newPipe.name = newPipe.name.replace('pipe-', `pipe-${order}-`);
    return newPipe;
  }

  function _addSyncPipe(pipe) {
    if (_blocking) {
      let lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
      lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push(pipe);
    } else {
      _outputState = execAllSyncPipe({..._outputState, pipe});
    }
  }

  function _addAsyncPipe(pipe) {
    _asyncPipeQueue.push(pipe);
    _syncPipesAfterAsync.set(pipe, []);
    _blocking || _execAsyncPipe({..._outputState, pipe});
  }

  function _execAsyncPipe(inputState) {
    _blocking = true;
    execAsyncPipe(_asyncPipeQueue[0], inputState, _nextPipe)
      .catch(err => {
        _handleErrFinish(err);
      })
      .then(() => _blocking = false);
  }

  function _nextPipe(pipe, state) {
    for (let syncPipe of _syncPipesAfterAsync.get(pipe)) {
      state = execAllSyncPipe({...state, pipe: syncPipe});
    }

    // 把异步管道退出队列
    _asyncPipeQueue.shift();
    // 删除同步 Pipe 和异步 Pipe 的依赖关系
    _syncPipesAfterAsync.delete(pipe);

    if (_asyncPipeQueue.length) {
      _execAsyncPipe(state);
    } else {
      _handleSuccFinish(state);
    }
  }

  return pipelineInstance;
}
