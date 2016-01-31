import _isPlainObject from 'lodash/lang/isPlainObject';
import utils from './utils';
import {runMiddlewares} from './middleware';
import {assertPipeHandler} from './asserts';

export function preparePipe(pipe, type, commonMiddlewares=[]) {
  if ( !(pipe && type) ) {
    throw new Error('preparePipe need "type" and "pipe" arguments');
  }

  if (pipe instanceof Function) pipe = {handle: pipe};

  let {name, middlewares=[]} = pipe;
  assertPipeHandler(`pipeline.${type}`, pipe);

  return {
    // flowReduce 还有 initialValue 参数
    // flowMap 还有 filter 参数
    ...pipe,
    name: name ? name : `pipe-${type}`,
    middlewares: middlewares.concat(commonMiddlewares)
  };
}

export function execAllSyncPipe(state) {
  switch(state.pipe.type) {
  case 'map':
    return execSyncMapPipe(state);
  case 'reduce':
    return execSyncReducePipe(state);
  default:
    return execSyncPipe(state);
  }
}

export function execSyncMapPipe(state) {
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
      cpPipe.handle = utils.pass;
    }
    let outputState = execSyncPipe({...state, pipe: cpPipe, value: item});
    keep && (
      isObject ? (output[key] = outputState.value) : output.push(outputState.value)
    );
  });
  return {...state, value: output};
}

export function execSyncReducePipe(state) {
  let {pipe, value} = state;
  let {list} = utils.values(value);
  state.value = list;
  state.pipe = {
    ...pipe,
    handle: v => {
      return v.reduce(pipe.handle, pipe.initialValue);
    }
  };
  return execSyncPipe(state);
}

export function execSyncPipe(state) {
  state = resetPipeState(state);
  let {middlewares} = state.pipe;

  let preState = runMiddlewares(middlewares, state, 'pre');

  let outputState = {...preState, skip: false};
  if (!preState.skip) outputState.value = preState.pipe.handle(preState.value);

  return runMiddlewares(middlewares, outputState, 'post');
}

export function execAsyncPipe(pipe, inputState, nextPipe) {
  inputState = resetPipeState(inputState);

  let {name, middlewares=[]} = pipe;

  let preState = runMiddlewares(middlewares, {...inputState, pipe}, 'pre');
  let outputState = {...preState, skip: false};
  if (preState.skip) nextPipe(pipe, outputState);

  let promise = preState.pipe.handle(preState.value);
  if (!(promise && promise.then instanceof Function && promise.catch instanceof Function)) {
    throw new Error(`
      [pipeline.flowAsync][${name}] accept a \`Function(pipeState)\`
      should return Promise instance!
    `);
  }

  return promise
    .then(data => {
      let postState = runMiddlewares(middlewares, {...outputState, value: data}, 'post');
      nextPipe(pipe, postState);
    });
}

export function resetPipeState(state) {
  return {...state, middlewareStack: []};
}
