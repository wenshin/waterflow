import _isPlainObject from 'lodash/lang/isPlainObject';
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
    name: name ? name : `pipe-${type}`,
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
  let isObject = _isPlainObject(outputState.value);
  let {list: promises, keys} = utils.toArray(outputState.value);

  return {
    ...state,
    promise: Promise.all(promises)
      .then(states => {
        let value = isObject ? {} : [];
        states.map((s, index) => {
          value[keys[index]] = s.value;
        });
        return {...state, value};
      })
  };
}

/**
 * 处理 flowMap 的使用场景
 * 1. ``
 * 2.
 */
export function execMapPipe(inputState, isAsync=false) {
  let {value, pipe} = inputState;
  let outputState = {...inputState};
  let isObject = _isPlainObject(value);
  let outputValue = isObject ? {} : [];
  let filter = pipe.filter;

  if ( !(filter && filter instanceof Function) ) filter = () => true;

  let {list: pipeInput, keys} = utils.toArray(value);
  let handleKeys = utils.keys(pipe.handles);
  let iterKeys = keys.length < handleKeys.length ? handleKeys : keys;

  iterKeys.map((key, index) => {
    let item = pipeInput[index];
    let cpPipe = {...pipe, name: `${pipe.name}-${key}`};
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
    cpPipe.handle = data => handle(data, breakPipeline.bind(outputState));

    let state = {...inputState, pipe: cpPipe, value: item, skip: pass};
    let itemOutput = isAsync ? execAsyncPipe(state).promise : execSyncPipe(state).value;

    keep && (
      isObject ? (outputValue[key] = itemOutput) : outputValue.push(itemOutput)
    );
  });

  outputState.value = outputValue;
  return outputState;
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
    promise: promise
      .then(data => {
        return runMiddlewares({...outputState, value: data}, 'post');
      })
  };
}

export function resetPipeState(state) {
  return {...state, middlewareStack: []};
}

export function breakPipeline() {
  this.break = true;
}
