import {assertState, assertMiddleware} from './asserts';

export default {
  middleware(name, type, {pre, post}) {
    return {name, type, pre, post};
  }
};

/**
 * 执行 Middlewares
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
export function runMiddlewares(inputState, handlerType, handle) {
  let {middlewares} = inputState.pipe;
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

