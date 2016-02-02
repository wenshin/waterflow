export function assertState(state) {
  if (!state.pipe) {
    throw new TypeError('Middleware handler should return a Object contain pipe and value properties');
  }
}

export function assertPipeHandler(pipe) {
  if ( !(pipe.handle instanceof Function) && (!pipe.handles || !pipe.handles.length ) ) {
    throw new TypeError(`the handle prop in pipe argument of [Pipe-${pipe.type}] must be function!`);
  }
}

export function assertFlowReducePipe(pipe) {
  // initialValue is NaN
  if (pipe.initialValue !== pipe.initialValue) {
    throw new TypeError(`the initialValue prop of [Pipe-${pipe.type}] can not be NaN!`);
  }
}

export function assertMiddleware(middleware, type) {
  if (middleware[type] && !(middleware[type] instanceof Function)) {
    throw new TypeError('Middleware handler should be a function');
  }
}

export function assertPromise(name, promise) {
  if (!(promise && promise.then instanceof Function && promise.catch instanceof Function)) {
    throw new Error(`
      [pipeline.flowAsync][${name}] accept a \`Function(pipeState)\`
      should return Promise instance!
    `);
  }
}

export default {assertState, assertPipeHandler, assertMiddleware};
