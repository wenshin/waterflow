import _isPlainObject from 'lodash/lang/isPlainObject';
import utils from './utils';
import {runMiddlewares} from './middleware';
import {assertPipeHandler} from './asserts';

let noop = () => {};
let pass = v => v;

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
    pipe: pass,
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

  let _handleSuccFinish = noop;
  let _handleErrFinish = noop;

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
        state = _resetPipeState(state);
        return runMiddlewares(_pipelineMiddlewares, state, 'post');
      }
    }
  };


  function _preparePipe(pipe, type) {
    if ( !(pipe && type) ) {
      throw new Error('_preparePipe need "type" and "pipe" arguments');
    }

    if (pipe instanceof Function) pipe = {handle: pipe};

    let {name, middlewares=[]} = pipe;
    assertPipeHandler(`pipeline.${type}`, pipe);

    _pipeCount++;
    return {
      // flowReduce 还有 initialValue 参数
      // flowMap 还有 filter 参数
      ...pipe,
      name: name ? name : `pipe-${_pipeCount}-${type}`,
      order: _pipeCount,
      middlewares
    };
  }

  function _addSyncPipe(pipe) {
    if (_blocking) {
      let lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
      lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push(pipe);
    } else {
      _outputState = _execAllSyncPipe({..._outputState, pipe});
    }
  }

  function _addAsyncPipe(pipe) {
    _asyncPipeQueue.push(pipe);
    _syncPipesAfterAsync.set(pipe, []);
    _blocking || _execAsyncPipe({..._outputState, pipe});
  }

  function _execAllSyncPipe(state) {
    switch(state.pipe.type) {
    case 'map':
      return _execSyncMapPipe(state);
    case 'reduce':
      return _execSyncReducePipe(state);
    default:
      return _execSyncPipe(state);
    }
  }

  function _execSyncMapPipe(state) {
    let {value, pipe} = state;
    let isObject = _isPlainObject(value);
    let {list: pipeInput, keys} = utils.values(value);

    let output = isObject ? {} : [];

    let filter = pipe.filter;
    if ( !(filter && filter instanceof Function) ) filter = () => true;

    pipeInput.map((item, index) => {
      let key = keys[index];
      let cpPipe = {...pipe, name: `${pipe.name}-${key}`};
      let keep = filter(item, key);
      // 分别指定处理方法
      if (cpPipe.handles) {
        if (cpPipe.handles[key]) {
          cpPipe.handle = cpPipe.handles[key];
        } else {
          keep = false;
        }
      }
      // 不被接受的数据
      if (!keep) {
        cpPipe.name = cpPipe.name + '-dropped';
        cpPipe.handle = pass;
      }
      let outputState = _execSyncPipe({...state, pipe: cpPipe, value: item});
      keep && (
        isObject ? (output[key] = outputState.value) : output.push(outputState.value)
      );
    });
    return {...state, value: output};
  }

  function _execSyncReducePipe(state) {
    let {pipe, value} = state;
    let {list} = utils.values(value);
    state.value = list;
    state.pipe = {
      ...pipe,
      handle: v => {
        return v.reduce(pipe.handle, pipe.initialValue);
      }
    };
    return _execSyncPipe(state);
  }

  function _execSyncPipe(state) {
    state = _resetPipeState(state);
    let {middlewares} = state.pipe;

    let preState = _runPipeMiddlewares(middlewares, state, 'pre');

    let outputState = {...preState, skip: false};
    if (!preState.skip) outputState.value = preState.pipe.handle(preState.value);

    return _runPipeMiddlewares(middlewares, outputState, 'post');
  }

  function _execAsyncPipe(inputState) {
    inputState = _resetPipeState(inputState);

    let pipe = _asyncPipeQueue[0];
    let {name, middlewares=[]} = pipe;

    let preState = _runPipeMiddlewares(middlewares, {...inputState, pipe}, 'pre');
    let outputState = {...preState, skip: false};
    if (preState.skip) _nextPipe(pipe, outputState);

    let promise = preState.pipe.handle(preState.value);
    if (!(promise && promise.then instanceof Function && promise.catch instanceof Function)) {
      throw new Error(`
        [pipeline.flowAsync][${name}] accept a \`Function(pipeState)\`
        should return Promise instance!
      `);
    }

    _blocking = true;

    promise
      .then(data => {
        let postState = _runPipeMiddlewares(middlewares, {...outputState, value: data}, 'post');
        _nextPipe(pipe, postState);
      })
      .catch(err => {
        _handleErrFinish(err);
      });
  }

  function _nextPipe(pipe, state) {
    _blocking = false;

    for (let syncPipe of _syncPipesAfterAsync.get(pipe)) {
      state = _execAllSyncPipe({...state, pipe: syncPipe});
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

  function _resetPipeState(state) {
    return {...state, middlewareStack: []};
  }

  function _runPipeMiddlewares(middlewares, inputState, handlerType, handle) {
    middlewares = [].concat(middlewares, _commonPipeMiddlewares);
    return runMiddlewares(middlewares, inputState, handlerType, handle);
  }

  return pipelineInstance;
}
