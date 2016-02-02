import _isPlainObject from 'lodash/lang/isPlainObject';
import utils from './utils';
import {runMiddlewares} from './middleware';
import {assertPipeHandler, assertFlowReducePipe} from './asserts';

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
  return Promise.all(outputState.value)
    .then(states => {
      return {...state, value: states.map(s => s.value)};
    });
}

export function execMapPipe(state, isAsync=false) {
  let {value, pipe} = state;
  let isObject = _isPlainObject(value);
  let {list: pipeInput, keys} = utils.values(value);
  let outputState = {...state};
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
      cpPipe.handle = isAsync ? utils.asyncPass : utils.pass;
    }

    let handle = cpPipe.handle;
    cpPipe.handle = data => handle(data, breakPipeline.bind(outputState));

    let itemOutput = isAsync
      ? execAsyncPipe({...state, pipe: cpPipe, value: item})
      : execSyncPipe({...state, pipe: cpPipe, value: item}).value;

    keep && (
      isObject ? (output[key] = itemOutput) : output.push(itemOutput)
    );
  });
  outputState.value = output;
  return outputState;
}

export function execSyncReducePipe(state) {
  let {pipe, value} = state;
  let {list} = utils.values(value);

  assertFlowReducePipe(pipe);

  state.value = list;
  state.pipe = {
    ...pipe,
    handle: (v, breakReducePipeline) => {
      return v.reduce(
        (pre, cur) => pipe.handle(pre, cur, breakReducePipeline),
        pipe.initialValue
      );
    }
  };
  return execSyncPipe(state);
}

export function execSyncPipe(state) {
  state = resetPipeState(state);

  let preState = runMiddlewares(state, 'pre');
  let outputState = {...preState, skip: false};

  assertPipeHandler(preState.pipe);

  if (!preState.skip) {
    outputState.value = preState.pipe.handle(preState.value, breakPipeline.bind(outputState));
  }
  return runMiddlewares(outputState, 'post');
}

export function execAsyncPipe(inputState) {
  inputState = resetPipeState(inputState);
  let {name} = inputState.pipe;

  let preState = runMiddlewares(inputState, 'pre');
  let outputState = {...preState, skip: false};
  if (preState.skip) preState.pipe.handle = utils.asyncPass;

  let promise = preState.pipe.handle(preState.value, breakPipeline.bind(outputState));
  if (!(promise && promise.then instanceof Function && promise.catch instanceof Function)) {
    throw new Error(`
      [pipeline.flowAsync][${name}] accept a \`Function(pipeState)\`
      should return Promise instance!
    `);
  }

  return promise
    .then(data => {
      return runMiddlewares({...outputState, value: data}, 'post');
    });
}

export function resetPipeState(state) {
  return {...state, middlewareStack: []};
}

export function breakPipeline() {
  this.break = true;
}
