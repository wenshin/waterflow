(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assertState = assertState;
exports.assertPipeHandler = assertPipeHandler;
exports.assertMiddleware = assertMiddleware;
function assertState(state) {
  if (!state.pipe || !state.value) {
    throw new TypeError('Middleware handler should return a Object contain pipe and value properties');
  }
}

function assertPipeHandler(pipe) {
  if (!(pipe.handle instanceof Function) && (!pipe.handles || !pipe.handles.length)) {
    throw new TypeError('the handle prop in pipe argument of [Pipe-' + pipe.type + '] must be function!');
  }
}

function assertMiddleware(middleware, type) {
  if (middleware[type] && !(middleware[type] instanceof Function)) {
    throw new TypeError('Middleware handler should be a function');
  }
}

exports.default = { assertState: assertState, assertPipeHandler: assertPipeHandler, assertMiddleware: assertMiddleware };
},{}],2:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils');

var _pipeline = require('./pipeline');

var _pipeline2 = _interopRequireDefault(_pipeline);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Middleware 设计为可拦截
 *
 * function(value, pipeObj) {
 *   // pipe 设置为 undefined Pipeline 将终止，而且只能在 PipeMiddleware.
 *   pipeObj.pipe = undefined;
 * }
 *
 * @Pipeline 概念介绍
 * (1): PipelineMiddleware1.pre
 * (2): PipeMiddleware1.pre
 * (3): PipeMiddleware1.post
 * (4): PipeMiddleware2.pre
 * (5): PipeMiddleware2.post
 * (6): PipelineMiddleware1.post
 * - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
 * | (1) | (2) (3) | pipe | (4) (5) | (2) (3) | pipe | (4) (5) | (6) |
 * - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
 *
 * @Usage:
 *   ```
 *   let pipeline = new Pipeline('myPipeline', [
 *     {name: 'pipe1', handle: v => v, type: 'flowAsync', middlewares=[]},
 *     {name: 'pipe2', handle: () => {}, middlewares=[]}
 *   ]);
 *   ```
 */

var Pipeline = (function () {
  _createClass(Pipeline, null, [{
    key: 'applyPipelineMiddlewares',

    /**
     * 追加 Pipeline 层次的中间件。
     *
     * @param  {Array PipelineMiddleware|PipelineMiddleware}  middlewares
     *     PipelineMiddleware 对象，Pipeline 层次的中间件
     *     ```
     *     {
     *       name: 'FooPipelinePlugin',
     *       type: 'pipeline',
     *       pre: Function(PipeState state),
     *       post: Function(PipeState state)
     *       pipeMiddleware: PipeMiddleware
     *     }
     *     ```
     *     函数也必须返回一个和参数同样结构的数组
     *     PipeState。中间件处理函数，接受一个 PipeState 对象作为参数
     *     ```
     *     {
     *       name: '', // Pipe 的名称
     *       value: '', // 当前值
     *       pipe: Function(value),
     *       skip: false
     *     }
     *     ```
     * @return {undefined}
     */

    // Pipeline 层的中间件
    value: function applyPipelineMiddlewares() {
      var middlewares = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

      Pipeline.pipelineMiddlewares = Pipeline.pipelineMiddlewares.concat(middlewares);
    }

    /**
     * 追加 Pipe 层次的中间件。
     *
     * @param  {Array PipeMiddleware|PipeMiddleware}  middlewares
     *     PipeMiddleware 对象，Pipeline 层次的中间件
     *     ```
     *     {
     *       name: 'FooPipePlugin',
     *       type: 'pipe',
     *       pre: Function(PipeState state),
     *       post: Function(PipeState state)
     *     }
     *     ```
     *     函数也必须返回一个和参数同样结构的数组
     *
     * @return {undefined}
     */

    // Pipe 层通用中间件，pre 优先执行，post 倒序执行

  }, {
    key: 'applyCommonPipeMiddlewares',
    value: function applyCommonPipeMiddlewares() {
      var middlewares = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

      Pipeline.commonPipeMiddlewares = Pipeline.commonPipeMiddlewares.concat(middlewares);
    }
  }]);

  function Pipeline() {
    var _this = this;

    var name = arguments.length <= 0 || arguments[0] === undefined ? 'pipeline' : arguments[0];
    var pipes = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    _classCallCheck(this, Pipeline);

    this._name = name;
    this._pipes = pipes;
    var delegate = function delegate(prop) {
      return Array.prototype[prop].bind(_this._pipes);
    };
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = Pipeline.inheritProps[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var prop = _step.value;

        this[prop] = delegate(prop);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }

  _createClass(Pipeline, [{
    key: 'flow',
    value: function flow(data) {
      var pipelined = (0, _pipeline2.default)(data, {
        name: this._name,
        middlewares: Pipeline.pipelineMiddlewares
      });
      pipelined = this.reduce(function (_pipelined, pipe) {
        var _pipe$type = pipe.type;
        var type = _pipe$type === undefined ? '' : _pipe$type;
        var _pipe$middlewares = pipe.middlewares;
        var middlewares = _pipe$middlewares === undefined ? [] : _pipe$middlewares;

        var pipelineMethod = 'flow' + _utils.strUtil.capitalize(type);
        return _pipelined[pipelineMethod](_extends({}, pipe, {
          middlewares: middlewares.concat(Pipeline.commonPipeMiddlewares)
        }));
      }, pipelined);
      return pipelined.finish();
    }
  }]);

  return Pipeline;
})();

Pipeline.inheritProps = ['push', 'pop', 'shift', 'unshift', 'concat', 'slice', 'splice', 'filter', 'map', 'reduce'];
Pipeline.pipelineMiddlewares = [];
Pipeline.commonPipeMiddlewares = [];
exports.default = Pipeline;
},{"./pipeline":7,"./utils":8}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runMiddlewares = runMiddlewares;

var _asserts = require('./asserts');

exports.default = {
  middleware: function middleware(name, type, _ref) {
    var pre = _ref.pre;
    var post = _ref.post;

    return { name: name, type: type, pre: pre, post: post };
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

function runMiddlewares(inputState, handlerType, handle) {
  var middlewares = inputState.pipe.middlewares;

  var outputState = inputState;

  if (middlewares.length) {
    outputState = middlewares.reduce(function (state, middleware) {
      (0, _asserts.assertState)(state);
      (0, _asserts.assertMiddleware)(middleware, handlerType);
      handle && handle(middleware);
      var newState = Object.assign(state);
      if (middleware[handlerType]) {
        newState = middleware[handlerType](state);
        newState.middlewareStack.push({
          handlerType: handlerType, middleware: middleware,
          inputState: state, outputState: newState
        });
      }
      return newState;
    }, inputState);
  }

  return outputState;
}
},{"./asserts":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var PipeLoggerMiddleware = exports.PipeLoggerMiddleware = {
  type: 'pipe',
  name: 'PipeLoggerMiddleware',
  pre: function pre(state) {
    logPipe(state);
    return state;
  },
  post: function post(state) {
    logPipe(state, true);
    return state;
  }
};

var isBrowser = !!console.groupCollapsed; // eslint-disable-line no-console;

var FONT_BOLD = 'font-weight: bold';
var PIPELINE_COLOR = 'color: #E91E63';
var PIPELINE_STYLE = PIPELINE_COLOR + ';' + FONT_BOLD;

var PipelineLoggerMiddleware = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre: function pre(state) {
    logPipeline(state);
    state.middlewareStack.length && _console('info')('PrePipeline', state);
    return state;
  },
  post: function post(state) {
    state.middlewareStack.length && _console('info')('postPipeline', state);
    logPipeline(state, true);
    return state;
  },

  pipeMiddleware: PipeLoggerMiddleware
};

function _console() {
  var type = arguments.length <= 0 || arguments[0] === undefined ? 'log' : arguments[0];

  if (!console) return;
  return (console[type] || console.log).bind(console); // eslint-disable-line no-console
}

function logPipeline(state) {
  var isOutput = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

  if (!isOutput) {
    if (isBrowser) {
      _console('groupCollapsed')((state.name || 'Pipeline') + ' %cInput : ', 'color: #E91E63', state.value);
    } else {
      _console('group')((state.name || 'Pipeline') + ' <<<Input>>>  ', state.value);
    }
  } else {
    if (isBrowser) {
      _console('groupEnd')();
      _console('log')('%c' + (state.name || 'Pipeline') + ' %cOutput: ', 'font-weight: bold', 'font-weight: bold;color: #E91E63', state.value);
    } else {
      _console('log')((state.name || 'Pipeline') + ' <<<Output>>> ', state.value);
    }
  }
}

function logPipe(state) {
  var isOutput = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

  var logger = isOutput ? 'log' : 'info';
  var type = isOutput ? 'out' : 'in ';
  var handlerType = isOutput ? 'post' : 'pre';
  var name = state.pipe.name || 'pipe' + state.pipe.order;
  var isAsync = name.includes('Async');
  var logState = Object.assign({}, state);

  logState.middlewareStack = state.middlewareStack.concat({
    handlerType: handlerType, PipeLoggerMiddleware: PipeLoggerMiddleware,
    inputState: state, outputState: state
  });

  name = isOutput && !isAsync ? name.replace(/./g, ' ') : name;
  var logValue = logState.skip ? 'SKIPED' : logState.value;
  if (isBrowser) {
    _console(logger)('%c' + name + ' %c' + type + ' %c' + logValue, 'color: #26C6DA', 'color: #555', 'color: #26A69A', logState);
  } else {
    _console(logger)('\n' + name + ' <<< ' + type + ' >>>\n ' + logValue, logState);
  }
}

exports.default = PipelineLoggerMiddleware;
},{}],5:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeRoundNumberHandler = makeRoundNumberHandler;
exports.toNumberHandler = toNumberHandler;
function makeRoundNumberHandler() {
  var digit = arguments.length <= 0 || arguments[0] === undefined ? 2 : arguments[0];

  return function roundNumberHandler(pipeState) {
    var actor = Math.pow(10, digit);
    pipeState = toNumberHandler(pipeState);
    return _extends({}, pipeState, { value: Math.round(pipeState.value * actor) / actor });
  };
}

function toNumberHandler(pipeState) {
  var value = Number(pipeState.value);
  if (!Number.isNaN(value)) {
    return _extends({}, pipeState, { value: value });
  } else {
    throw new TypeError('[toNumberHandler] can not change value to Nubmer');
  }
}
},{}],6:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.preparePipe = preparePipe;
exports.execAllSyncPipe = execAllSyncPipe;
exports.execAllAsyncPipe = execAllAsyncPipe;
exports.execSyncMapPipe = execSyncMapPipe;
exports.execAsyncMapPipe = execAsyncMapPipe;
exports.execMapPipe = execMapPipe;
exports.execSyncReducePipe = execSyncReducePipe;
exports.execSyncPipe = execSyncPipe;
exports.execAsyncPipe = execAsyncPipe;
exports.resetPipeState = resetPipeState;

var _isPlainObject2 = require('lodash/lang/isPlainObject');

var _isPlainObject3 = _interopRequireDefault(_isPlainObject2);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _middleware = require('./middleware');

var _asserts = require('./asserts');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function preparePipe(pipe, type) {
  var commonMiddlewares = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

  if (!(pipe && type)) {
    throw new Error('preparePipe need "pipe" and "type"');
  }

  if (pipe instanceof Function) pipe = { handle: pipe };

  var _pipe = pipe;
  var name = _pipe.name;
  var _pipe$middlewares = _pipe.middlewares;
  var middlewares = _pipe$middlewares === undefined ? [] : _pipe$middlewares;

  return _extends({}, pipe, {
    type: type,
    name: name ? name : 'pipe-' + type,
    middlewares: middlewares.concat(commonMiddlewares)
  });
}

function execAllSyncPipe(state) {
  switch (state.pipe.type) {
    case 'flow':
      return execSyncPipe(state);
    case 'flowMap':
      return execSyncMapPipe(state);
    case 'flowReduce':
      return execSyncReducePipe(state);
  }
}

function execAllAsyncPipe(state) {
  switch (state.pipe.type) {
    case 'flowAsync':
      return execAsyncPipe(state);
    case 'flowMapAsync':
      return execAsyncMapPipe(state);
  }
}

function execSyncMapPipe(state) {
  return execMapPipe(state);
}

function execAsyncMapPipe(state) {
  var outputState = execMapPipe(state, true);
  return Promise.all(outputState.value).then(function (states) {
    return _extends({}, state, { value: states.map(function (s) {
        return s.value;
      }) });
  });
}

function execMapPipe(state) {
  var isAsync = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
  var value = state.value;
  var pipe = state.pipe;

  var isObject = (0, _isPlainObject3.default)(value);

  var _utils$values = _utils2.default.values(value);

  var pipeInput = _utils$values.list;
  var keys = _utils$values.keys;

  var output = isObject ? {} : [];

  var filter = pipe.filter;
  if (!(filter && filter instanceof Function)) filter = function () {
    return true;
  };

  pipeInput.map(function (item, index) {
    var key = keys[index];
    var cpPipe = _extends({}, pipe, { name: pipe.name + '-' + key });
    var keep = filter(item, key);
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
      cpPipe.handle = isAsync ? _utils2.default.asyncPass : _utils2.default.pass;
    }

    var itemOutput = isAsync ? execAsyncPipe(_extends({}, state, { pipe: cpPipe, value: item })) : execSyncPipe(_extends({}, state, { pipe: cpPipe, value: item })).value;

    keep && (isObject ? output[key] = itemOutput : output.push(itemOutput));
  });
  return _extends({}, state, { value: output });
}

function execSyncReducePipe(state) {
  var pipe = state.pipe;
  var value = state.value;

  var _utils$values2 = _utils2.default.values(value);

  var list = _utils$values2.list;

  state.value = list;
  state.pipe = _extends({}, pipe, {
    handle: function handle(v) {
      return v.reduce(pipe.handle, pipe.initialValue);
    }
  });
  return execSyncPipe(state);
}

function execSyncPipe(state) {
  state = resetPipeState(state);

  var preState = (0, _middleware.runMiddlewares)(state, 'pre');
  var outputState = _extends({}, preState, { skip: false });

  (0, _asserts.assertPipeHandler)(preState.pipe);

  if (!preState.skip) outputState.value = preState.pipe.handle(preState.value);
  return (0, _middleware.runMiddlewares)(outputState, 'post');
}

function execAsyncPipe(inputState) {
  inputState = resetPipeState(inputState);
  var name = inputState.pipe.name;

  var preState = (0, _middleware.runMiddlewares)(inputState, 'pre');
  var outputState = _extends({}, preState, { skip: false });
  if (preState.skip) preState.pipe.handle = _utils2.default.asyncPass;

  var promise = preState.pipe.handle(preState.value);
  if (!(promise && promise.then instanceof Function && promise.catch instanceof Function)) {
    throw new Error('\n      [pipeline.flowAsync][' + name + '] accept a `Function(pipeState)`\n      should return Promise instance!\n    ');
  }

  return promise.then(function (data) {
    return (0, _middleware.runMiddlewares)(_extends({}, outputState, { value: data }), 'post');
  });
}

function resetPipeState(state) {
  return _extends({}, state, { middlewareStack: [] });
}
},{"./asserts":1,"./middleware":3,"./utils":8,"lodash/lang/isPlainObject":26}],7:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = pipeline;

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _middleware = require('./middleware');

var _pipe = require('./pipe');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
function pipeline(_input) {
  var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var _ref$name = _ref.name;

  var _pipelineName = _ref$name === undefined ? '' : _ref$name;

  var _ref$middlewares = _ref.middlewares;

  var _pipelineMiddlewares = _ref$middlewares === undefined ? [] : _ref$middlewares;

  var _inputState = {
    name: _pipelineName,
    value: _input,
    pipe: { handle: _utils2.default.pass, middlewares: _pipelineMiddlewares },
    skip: false,
    middlewareStack: []
  };

  var _commonPipeMiddlewares = [];
  var _outputState = (0, _middleware.runMiddlewares)(_inputState, 'pre', function (middleware) {
    middleware.pipeMiddleware && _commonPipeMiddlewares.push(middleware.pipeMiddleware);
  });

  var _pipeCount = 0;
  // 执行异步 Pipe 时设置为 true
  var _blocking = false;
  // 异步 Pipe 队列。当 Pipe 执行完成后才会从队列中移除
  var _asyncPipeQueue = [/*{name, pipe}*/];
  // 异步 Pipe 之后的同步 Pipe 队列
  var _syncPipesAfterAsync = new Map(); // {[Async{name, pipe}] => [Sync{name, pipe}]}

  var _handleSuccFinish = _utils2.default.noop;
  var _handleErrFinish = _utils2.default.noop;

  var pipelineInstance = {
    /**
     * 同步执行函数
     * @param  {Object} pipe
     *     ```
     *     {name, handle, middlewares}
     *     ```
     * @return {[type]}         [description]
     */

    flow: function flow(pipe) {
      pipe = _preparePipe(pipe, 'flow');
      _addSyncPipe(pipe);
      return pipelineInstance;
    },
    flowAsync: function flowAsync(pipe) {
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
    flowMap: function flowMap(pipe) {
      pipe = _preparePipe(pipe, 'flowMap');
      _addSyncPipe(pipe);
      return pipelineInstance;
    },
    flowMapAsync: function flowMapAsync(pipe) {
      pipe = _preparePipe(pipe, 'flowMapAsync');
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
    flowReduce: function flowReduce(pipe) {
      pipe = _preparePipe(pipe, 'flowReduce');
      _addSyncPipe(pipe);
      return pipelineInstance;
    },
    finish: function finish() {
      if (_blocking || _asyncPipeQueue.length) {
        return new Promise(function (resolve, reject) {
          _handleSuccFinish = function (output) {
            resolve(finishSuccess(output).value);
          };
          _handleErrFinish = function (err) {
            reject(err);
          };
        });
      } else {
        return finishSuccess(_outputState).value;
      }

      function finishSuccess(state) {
        state = (0, _pipe.resetPipeState)(state);
        state.pipe = { middlewares: _pipelineMiddlewares };
        return (0, _middleware.runMiddlewares)(state, 'post');
      }
    }
  };

  function _preparePipe(pipe, type) {
    var newPipe = (0, _pipe.preparePipe)(pipe, type, _commonPipeMiddlewares);
    var order = ++_pipeCount;
    newPipe.order = order;
    newPipe.name = newPipe.name.replace('pipe-', 'pipe-' + order + '-');
    return newPipe;
  }

  function _addSyncPipe(pipe) {
    if (_blocking) {
      var lastAsyncPipe = _asyncPipeQueue.slice(-1)[0];
      lastAsyncPipe && _syncPipesAfterAsync.get(lastAsyncPipe).push(pipe);
    } else {
      _outputState = (0, _pipe.execAllSyncPipe)(_extends({}, _outputState, { pipe: pipe }));
    }
  }

  function _addAsyncPipe(pipe) {
    _asyncPipeQueue.push(pipe);
    _syncPipesAfterAsync.set(pipe, []);
    _blocking || _execAsyncPipe(_extends({}, _outputState));
  }

  function _execAsyncPipe(inputState) {
    _blocking = true;
    inputState.pipe = _asyncPipeQueue[0];

    (0, _pipe.execAllAsyncPipe)(inputState).then(function (state) {
      return _asyncNext(state);
    }).catch(function (err) {
      _handleErrFinish(err);
    }).then(function () {
      return _blocking = false;
    });
  }

  function _asyncNext(state) {
    var _state = state;
    var asyncPipe = _state.pipe;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {

      for (var _iterator = _syncPipesAfterAsync.get(asyncPipe)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var syncPipe = _step.value;

        state = (0, _pipe.execAllSyncPipe)(_extends({}, state, { pipe: syncPipe }));
      }

      // 把异步管道退出队列
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

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
},{"./middleware":3,"./pipe":6,"./utils":8}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.strUtil = undefined;

var _isPlainObject2 = require('lodash/lang/isPlainObject');

var _isPlainObject3 = _interopRequireDefault(_isPlainObject2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var strUtil = exports.strUtil = {
  capitalize: function capitalize(str) {
    return str ? str.replace(str[0], str[0].toUpperCase()) : '';
  }
};

exports.default = {
  pass: function pass(v) {
    return v;
  },

  asyncPass: function asyncPass(v) {
    return Promise.resolve(v);
  },

  noop: function noop() {},
  values: function values(data) {
    var list = undefined;
    var keys = [];

    if (Array.isArray(data)) {
      keys = data.map(function (item, index) {
        return index;
      });
      list = [].concat(data);
    } else if ((0, _isPlainObject3.default)(data)) {
      keys = Object.keys(data);
      list = keys.map(function (key) {
        return data[key];
      });
    }
    return { list: list, keys: keys };
  },

  strUtil: strUtil
};
},{"lodash/lang/isPlainObject":26}],9:[function(require,module,exports){
var Pipeline = require('../../dist').default;
var PipelineLogger = require('../../dist/middlewares/logger').default;
var makeRoundNumberHandler = require('../../dist/middlewares/number').makeRoundNumberHandler;

Pipeline.pipelineMiddlewares.push(PipelineLogger);

var RoundNumberPipeMiddleware = {
  type: 'pipe',
  name: 'RoundNumberPipeMiddleware',
  post: makeRoundNumberHandler()
};

var pl = new Pipeline('myPipeline', [
  {name: 'pipe1', handle: v => 1 / v},
  {
    name: '2times',
    type: 'async',
    handle: v => {
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(v * 2));
      });
    }
  },
  {handle: () => [1, 2, 3]},
  {name: 'map', handle: v => 1/v, filter: v => v < 30, type: 'map'},
  {
    name: 'reduce',
    type: 'reduce',
    handle: (pre, cur) => pre + cur,
    initialValue: 0,
    middlewares: [RoundNumberPipeMiddleware]
  },
  {name: 'plus', handle: v => v + 0.1}
]);

pl.flow(10);

},{"../../dist":2,"../../dist/middlewares/logger":4,"../../dist/middlewares/number":5}],10:[function(require,module,exports){
var createBaseFor = require('./createBaseFor');

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./createBaseFor":13}],11:[function(require,module,exports){
var baseFor = require('./baseFor'),
    keysIn = require('../object/keysIn');

/**
 * The base implementation of `_.forIn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForIn(object, iteratee) {
  return baseFor(object, iteratee, keysIn);
}

module.exports = baseForIn;

},{"../object/keysIn":27,"./baseFor":10}],12:[function(require,module,exports){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],13:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{"./toObject":20}],14:[function(require,module,exports){
var baseProperty = require('./baseProperty');

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

module.exports = getLength;

},{"./baseProperty":12}],15:[function(require,module,exports){
var isNative = require('../lang/isNative');

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

module.exports = getNative;

},{"../lang/isNative":24}],16:[function(require,module,exports){
var getLength = require('./getLength'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

module.exports = isArrayLike;

},{"./getLength":14,"./isLength":18}],17:[function(require,module,exports){
/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

module.exports = isIndex;

},{}],18:[function(require,module,exports){
/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],19:[function(require,module,exports){
/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],20:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

module.exports = toObject;

},{"../lang/isObject":25}],21:[function(require,module,exports){
var isArrayLike = require('../internal/isArrayLike'),
    isObjectLike = require('../internal/isObjectLike');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{"../internal/isArrayLike":16,"../internal/isObjectLike":19}],22:[function(require,module,exports){
var getNative = require('../internal/getNative'),
    isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var arrayTag = '[object Array]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

module.exports = isArray;

},{"../internal/getNative":15,"../internal/isLength":18,"../internal/isObjectLike":19}],23:[function(require,module,exports){
var isObject = require('./isObject');

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 which returns 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

module.exports = isFunction;

},{"./isObject":25}],24:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isObjectLike = require('../internal/isObjectLike');

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isNative;

},{"../internal/isObjectLike":19,"./isFunction":23}],25:[function(require,module,exports){
/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],26:[function(require,module,exports){
var baseForIn = require('../internal/baseForIn'),
    isArguments = require('./isArguments'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * **Note:** This method assumes objects created by the `Object` constructor
 * have no inherited enumerable properties.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  var Ctor;

  // Exit early for non `Object` objects.
  if (!(isObjectLike(value) && objToString.call(value) == objectTag && !isArguments(value)) ||
      (!hasOwnProperty.call(value, 'constructor') && (Ctor = value.constructor, typeof Ctor == 'function' && !(Ctor instanceof Ctor)))) {
    return false;
  }
  // IE < 9 iterates inherited properties before own properties. If the first
  // iterated property is an object's own property then there are no inherited
  // enumerable properties.
  var result;
  // In most environments an object's own properties are iterated before
  // its inherited properties. If the last iterated property is an object's
  // own property then there are no inherited enumerable properties.
  baseForIn(value, function(subValue, key) {
    result = key;
  });
  return result === undefined || hasOwnProperty.call(value, result);
}

module.exports = isPlainObject;

},{"../internal/baseForIn":11,"../internal/isObjectLike":19,"./isArguments":21}],27:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('../internal/isIndex'),
    isLength = require('../internal/isLength'),
    isObject = require('../lang/isObject');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"../internal/isIndex":17,"../internal/isLength":18,"../lang/isArguments":21,"../lang/isArray":22,"../lang/isObject":25}]},{},[9]);
