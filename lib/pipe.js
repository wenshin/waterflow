import _isPlainObject from 'lodash/lang/isPlainObject';
import _values from 'lodash/object/values';
import utils from './utils';
import {runMiddlewares} from './middleware';
import {assertPipeHandler, assertFlowReducePipe, assertPromise} from './asserts';

const TYPES = {
  SYNC: 'flow',
  ASYNC: 'flowAsync',
  MAP: 'flowMap',
  MAP_ASYNC: 'flowMapAsync',
  REDUCE: 'flowReduce'
};

export function preparePipe(pipe, type, commonMiddlewares=[]) {
  if ( !(pipe && type) ) {
    throw new Error('preparePipe need "pipe" and "type"');
  }

  if (pipe instanceof Function) pipe = {handle: pipe};

  let {name, middlewares=[]} = pipe;

  return {
    // flowReduce 还有 initialValue 参数
    // flowMap 还有 filter 参数
    ...pipe,
    type,
    name: name || `pipe-${type}`,
    middlewares: middlewares.concat(commonMiddlewares)
  };
}

export function execAllSyncPipe(state) {
  switch(state.pipe.type) {
  case TYPES.SYNC:
    return execSyncPipe(state);
  case TYPES.MAP:
    return execSyncMapPipe(state);
  case TYPES.REDUCE:
    return execSyncReducePipe(state);
  }
}

export function execAllAsyncPipe(state) {
  switch(state.pipe.type) {
  case TYPES.ASYNC:
    return execAsyncPipe(state);
  case TYPES.MAP_ASYNC:
    return execAsyncMapPipe(state);
  }
}

export function execSyncMapPipe(state) {
  return execMapPipe(state);
}

export function execAsyncMapPipe(state) {
  let outputState = execMapPipe(state, true);
  return Object.assign(outputState, {
    promise: promiseAll(outputState)
  });
}

/**
 * 处理 flowMap 的使用场景
 * 1. [Function, ...] => [data, ...]
 * 2. {a: Function, ...} => {a: data, ...}
 */
export function execMapPipe(inputState, isAsync=false) {
  let {value, pipe} = inputState;
  let outputState = {...inputState};
  let isObject = _isPlainObject(value);
  let outputValue = isObject ? {} : [];
  let filter = pipe.filter;

  if ( !(filter && filter instanceof Function) ) filter = () => true;

  // 对象和数组，都用 Object.keys() 的值来遍历
  let {list: pipeInput, keys} = utils.toArray(value);
  let handleKeys = utils.keys(pipe.handles);
  let iterKeys = keys.length < handleKeys.length ? handleKeys : keys;
  let isSkip = false;

  iterKeys.map((key, index) => {
    let item = pipeInput[index];
    let cpPipe = {...pipe, name: `${pipe.name}-${key}`, mapIndex: index};
    // 当 pipeInput 的长度比pipe.handles 的长度小时，超出 pipeInput 长度的遍历不执行 filter。
    let keep = pipeInput.length - 1 >= index ? filter(item, key) : true;
    let pass = !keep;

    // 分别指定处理方法
    if (cpPipe.handles) {
      if (cpPipe.handles[key]) {
        cpPipe.handle = cpPipe.handles[key];
      } else {
        pass = true;
      }
    }

    // 需要过滤掉的数据的 `name` 增加 '-dropped' 后缀，打 log 时能够清晰看到
    if (!keep) cpPipe.name = cpPipe.name + '-dropped';

    // 当数据不保留时跳过，以及 handle 不存在时，什么也不做
    if (pass) cpPipe.handle = isAsync ? utils.asyncPass : utils.pass;

    let handle = cpPipe.handle;
    cpPipe.handle = data => handle(data, key, breakPipeline.bind(outputState));

    let state = {...inputState, pipe: cpPipe, value: item, skip: pass};
    let _outputState = isAsync ? execAsyncPipe(state) : execSyncPipe(state);
    let itemOutput = isAsync ? _outputState.promise : _outputState.value;

    if (keep) {
      isSkip = isSkip || _outputState.skip;
      isObject ? (outputValue[key] = itemOutput) : outputValue.push(itemOutput);
    }
  });

  return Object.assign(outputState, {
    value: outputValue,
    skip: isSkip
  });
}

export function execSyncReducePipe(state) {
  let {pipe, value} = state;
  let {list} = utils.toArray(value);
  let initialValue = pipe.initialValue === undefined ? null : pipe.initialValue;

  assertFlowReducePipe(pipe);

  state.value = list;
  state.pipe = {
    ...pipe,
    handle: (v, breakReducePipeline) => {
      return v.reduce(
        (pre, cur) => pipe.handle(pre, cur, breakReducePipeline),
        initialValue
      );
    }
  };
  return execSyncPipe(state);
}

export function execSyncPipe(state) {
  let preState;
  let outputState;

  state = resetPipeState(state);
  preState = runMiddlewares(state, 'pre');

  assertPipeHandler(preState.pipe);

  outputState = {...preState, skip: false};
  if (!preState.skip) {
    outputState.value = preState.pipe.handle(preState.value, breakPipeline.bind(outputState));
  }
  return runMiddlewares(outputState, 'post');
}

export function execAsyncPipe(inputState) {
  inputState = resetPipeState(inputState);

  let promise;
  let {name} = inputState.pipe;
  let preState = runMiddlewares(inputState, 'pre');
  let outputState = {...preState, skip: false};

  if (preState.skip) preState.pipe.handle = utils.asyncPass;
  promise = preState.pipe.handle(preState.value, breakPipeline.bind(outputState));

  assertPromise(name, promise);

  return {
    ...inputState,
    promise: new Promise((resolve, reject) => {
      promise
        .then(data => {
          return resolve(runMiddlewares({...outputState, value: data}, 'post'));
        }, error => {
          return reject(runMiddlewares({...outputState, value: error}, 'post'));
        });
    })
  };
}

export function resetPipeState(state) {
  return {...state, middlewareStack: []};
}

export function breakPipeline() {
  this.break = true;
}

/**
 * 多个 Promise 合并为一个 Promise 实例。
 * @param  {Object}  state
 *     当前 Pipeline 状态
 * @param  {Boolean}   breakImmediately
 *     true: 使用 ES6 Promise.all 模式。 该模式下， 一旦有一个 promise 执行失败了，
 *           那么将不再等待其它 Promise 实例返回结果。
 *     false: 默认，不适用 ES6 Promise.all
 * @return {Promise}
 */
function promiseAll(state, breakImmediately=false) {
  // @var  {Iterator|Object}  promises
  // Promise 实例的数组或者 Iterator，当 breakImmediately: false 时，还支持对象格式
  let promises = state.value;
  let isSkip = false;
  // TODO，使用 Promise.all，promises
  if (breakImmediately) return Promise.all(promises);

  return new Promise((resolve, reject) => {
    let keys = utils.keys(promises);
    let finishCount = 0;
    let sum = keys.length;
    let result = {
      errors: {},
      data: {}
    };

    let newState = value => {
      return {...state, skip: isSkip, value};
    };

    let always = s => {
      isSkip = isSkip || s.skip;

      if (++finishCount < sum) return;

      if (Object.keys(result.errors).length) {
        reject(newState( flatNestErrors(result) ));
      } else {
        resolve(newState(
          Array.isArray(promises)
            ? utils.toArray(result.data).list
            : result.data
        ));
      }
    };

    let succWrap = key => s => {
      result.data[key] = s.value;
      always(s);
    };

    let failWrap = key => s => {
      result.errors[key] = s.value;
      always(s);
    };

    for (let key of keys) {
      promises[key]
        .then(succWrap(key), failWrap(key));
    }
  });
}

/**
 * 处理`{data: {}, errors{key: {data: {}, errors: {key1: 'error'}}}`
 * 这种出现出错嵌套的问题。
 * 转换为`{data: {key: {}}, errors{key: ['error']}`
 */

function flatNestErrors({data, errors}) {
  let flatError = {data, errors: {}};

  for (let key of Object.keys(errors)) {
    let error = errors[key];

    if ( isMixError(error) ) {
      let flatErr = flatNestErrors(error);
      if (Object.keys(flatErr.data).length) {
        Object.assign(flatError.data, {[key]: flatErr.data});
      }
      flatError.errors[key] = Object.keys(flatErr.errors)
        .reduce((prev, k) => prev.concat(flatErr.errors[k]), []);
    } else {
      flatError.errors[key] = [].concat(error);
    }
  }

  return flatError;
}

/**
 * 混合错误结果。当并发执行多个异步任务时，如果只有其中一个错误，则会形成混合结果。
 * 例子：
 *   ```
 *   {data: {key1: 1}, errors: {key2: 'error msg'}}
 *   ```
 * @return {Boolean}
 */
function isMixError(mixError) {
  return _isPlainObject(mixError.data) && _isPlainObject(mixError.errors);
}
