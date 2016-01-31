import {assertState, assertMiddleware} from './assert';

export default {
  middleware(name, type, {pre, post}) {
    return {name, type, pre, post};
  }
};

/**
 * 执行 Middlewares
 * @param  {Function Array} middlewares
 * @param  {Object} inputState
 *     ```
 *     {
 *       name, // Pipeline Name
 *       pipe: {name: '', handle: '', middlewares},
 *       value,
 *       skip // 如果是 true 将会跳过当前 Pipe
 *     }
 *     ```
 * @return {Object} 和 inputState 一样的对象结构
 */
export function runMiddlewares(middlewares, inputState, handlerType, handle) {
  let outputState = inputState;

  if (middlewares.length) {
    outputState = middlewares.reduce((state, middleware) => {
      assertState(state);
      assertMiddleware(middleware, handlerType);
      handle && handle(middleware);
      let newState = Object.assign(state);
      if (middleware[handlerType]) {
        newState = middleware[handlerType](state);
        newState.middlewareStack.push({
          handlerType, middleware,
          inputState: state, outputState: newState
        });
      }
      return newState;
    }, inputState);
  }

  return outputState;
}

