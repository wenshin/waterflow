export function assertState(state) {
  if (!state.pipe || !state.value) {
    throw new TypeError('Middleware handler should return a Object contain pipe and value properties');
  }
}

export function assertPipeHandler(pipe) {
  if ( !(pipe.handle instanceof Function) && (!pipe.handles || !pipe.handles.length ) ) {
    throw new TypeError(`the handle prop in pipe argument of [Pipe-${pipe.type}] must be function!`);
  }
}

// 不要传递第二个参数
export function assertFlowReducePipe(pipe, undef) {
  if (pipe.initialValue === undef) {
    throw new TypeError(`the initialValue prop in pipe argument of [Pipe-${pipe.type}] is required!`);
  }
}

export function assertMiddleware(middleware, type) {
  if (middleware[type] && !(middleware[type] instanceof Function)) {
    throw new TypeError('Middleware handler should be a function');
  }
}

export default {assertState, assertPipeHandler, assertMiddleware};
