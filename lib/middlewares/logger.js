const isBrowser = !!console.groupCollapsed; // eslint-disable-line no-console

export let PipeLoggerMiddleware = {
  type: 'pipe',
  name: 'PipeLoggerMiddleware',
  pre(state) {
    logPipe(state);
    return state;
  },
  post(state) {
    logPipe(state, true);
    return state;
  }
};

function logPipe(state, isOutput=false) {
  if (!_isLogging(state.settings)) return;
  if (state.break) logBreak(state, isOutput);

  let logger = isOutput ? 'log' : 'info';
  let type = isOutput ? 'out' : 'in ';
  let handlerType = isOutput ? 'post' : 'pre';
  let name = state.pipe.name || 'pipe' + state.pipe.order;
  let logState = _logState(state);

  logState.middlewareStack = state.middlewareStack.concat({
    handlerType, PipeLoggerMiddleware,
    inputState: state, outputState: state
  });

  let logValue = state.skip ? 'SKIPED' : state.value;
  let args = [];

  if (isBrowser) {
    args = [`%c${name} %c${type}`, 'color: #26C6DA', 'color: #555', logValue];
    _isVerbose(state.settings) && ( args = args.concat(['| State:', logState]) );
  } else {
    args = [`\n${name} <<< ${type} >>>\n ${logValue}`];
    _isVerbose(state.settings) && args.push(logState);
  }

  _log(state, isOutput, args, logger);
}

let PipelineLoggerMiddleware = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre(state) {
    logPipeline(state);
    return state;
  },
  post(state) {
    logPipeline(state, true);
    return state;
  },
  pipeMiddleware: PipeLoggerMiddleware
};

function logPipeline(state, isOutput=false) {
  if (!_isLogging(state.settings)) return;

  let hasMiddlewares = state.middlewareStack.length;
  let logState = _logState(state);

  if (!isOutput) {
    if (isBrowser) {
      _log(state, isOutput, [`${state.name || 'Pipeline'} %cInput : `, 'color: #E91E63', state.value], 'groupCollapsed');
    } else {
      _log(state, isOutput, [`${state.name || 'Pipeline'} <<<Input>>>  `, state.value], 'group');
    }
    hasMiddlewares && _console('info')('PrePipeline', logState);
  } else {
    _consoleState(state);
    hasMiddlewares && _console('info')('postPipeline', logState);
    if (isBrowser) {
      _console('groupEnd')();
      _console('log')(
        `%c${state.name || 'Pipeline'} %cOutput: `,
        'font-weight: bold', 'font-weight: bold;color: #E91E63',
        state.value);
    } else {
      _console('log')(`${state.name || 'Pipeline'} <<<Output>>> `, state.value);
    }
  }
}

function logBreak(state, isOutput) {
  if (isBrowser) {
    _log(state, isOutput, ['%cPipeline Break!', 'color: #E91E63']);
  } else {
    _log(state, isOutput, ['<<<Pipeline Break>>>']);
  }
}

function _log(state, isOutput, args, type='log') {
  let {pipe} = state;
  let log = {order: _order(pipe.order, isOutput, pipe.mapIndex), type, args};
  if (!state.consoleStack) {
    state.consoleStack = [log];
  } else {
    state.consoleStack.push(log);
  }
}

function _consoleState(state) {
  state.consoleStack.sort((a, b) => a.order - b.order);
  state.consoleStack.forEach(log => {
    _console(log.type).apply(null, log.args);
  });
}

function _console(type='log') {
  if (!console) return;
  return (console[type] || console.log).bind(console); // eslint-disable-line no-console
}

function _isLogging(settings) {
  return settings.logging === false ? false : true;
}


function _isVerbose(settings) {
  return settings.verbose;
}

function _logState(state) {
  let s = {...state};
  delete s.consoleStack;
  return s;
}

function _order(pipeOrder, isOutput, mapIndex=0) {
  return parseFloat(`${pipeOrder}.${mapIndex}${isOutput ? 1 : 0}`);
}

export default PipelineLoggerMiddleware;
