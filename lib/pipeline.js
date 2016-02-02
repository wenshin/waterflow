import utils from './utils';
import {runMiddlewares} from './middleware';
import {preparePipe, resetPipeState, execAllSyncPipe, execAllAsyncPipe} from './pipe';

let commonPipeMiddlewares = [];
let commonPipelineMiddlewares = [];

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
  _pipelineMiddlewares = [].concat(_pipelineMiddlewares, commonPipelineMiddlewares);

  let _inputState = {
    name: _pipelineName,
    value: _input,
    pipe: {
      handle: utils.pass,
      middlewares: _pipelineMiddlewares
    },
    skip: false,
    break: false,
    middlewareStack: []
  };

  let _commonPipeMiddlewares = [].concat(commonPipeMiddlewares);
  let _outputState = runMiddlewares(
    _inputState,
    'pre',
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
      _addPipe(pipe, 'flow');
      return pipelineInstance;
    },

    flowAsync(pipe) {
      _addPipe(pipe, 'flowAsync');
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
      _addPipe(pipe, 'flowMap');
      return pipelineInstance;
    },

    flowMapAsync(pipe) {
      _addPipe(pipe, 'flowMapAsync');
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
      _addPipe(pipe, 'flowReduce');
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
        state.pipe = {middlewares: _pipelineMiddlewares};
        return runMiddlewares(state, 'post');
      }
    }
  };

  function _addPipe(pipe, type) {
    if (_outputState.break) return;

    pipe = _preparePipe(pipe, type);
    if (type.includes('Async')) {
      _addAsyncPipe(pipe);
    } else {
      _addSyncPipe(pipe);
    }
  }

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
      _outputState = _execSyncPipe({..._outputState, pipe});
    }
  }

  function _addAsyncPipe(pipe) {
    _asyncPipeQueue.push(pipe);
    _syncPipesAfterAsync.set(pipe, []);
    _blocking || _execAsyncPipe({..._outputState});
  }

  function _execSyncPipe(inputState) {
    return inputState.break ? inputState : execAllSyncPipe(inputState);
  }

  function _execAsyncPipe(inputState) {
    if (inputState.break) return;

    _blocking = true;
    inputState.pipe = _asyncPipeQueue[0];

    execAllAsyncPipe(inputState).promise
      .then(state => _asyncNext(state))
      .catch(err => {
        _handleErrFinish(err);
      })
      .then(() => _blocking = false);
  }

  function _asyncNext(state) {
    // 中间件设置 break 或者调用 breakPipeline 设置全局 break。
    if (state.break) _handleSuccFinish(state);

    let {pipe: asyncPipe} = state;

    for (let syncPipe of _syncPipesAfterAsync.get(asyncPipe)) {
      state = _execSyncPipe({...state, pipe: syncPipe});
    }

    // 把异步管道退出队列
    _asyncPipeQueue.shift();
    // 删除同步 Pipe 和异步 Pipe 的依赖关系
    _syncPipesAfterAsync.delete(asyncPipe);

    if (_asyncPipeQueue.length) {
      _execAsyncPipe(state);
    } else {
      _handleSuccFinish(state);
    }
  }

  return pipelineInstance;
}

export function setCommonPipelineMiddlewares(middlewares) {
  commonPipelineMiddlewares = middlewares;
}

export function setCommonPipeMiddlewares(middlewares) {
  commonPipeMiddlewares = middlewares;
}
