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
  if (state.break) logBreak();

  let logger = isOutput ? 'log' : 'info';
  let type = isOutput ? 'out' : 'in ';
  let handlerType = isOutput ? 'post' : 'pre';
  let name = state.pipe.name || 'pipe' + state.pipe.order;
  let logState = Object.assign({}, state);

  logState.middlewareStack = state.middlewareStack.concat({
    handlerType, PipeLoggerMiddleware,
    inputState: state, outputState: state
  });

  let logValue = logState.skip ? 'SKIPED' : logState.value;
  if (isBrowser) {
    _console(logger)(
      `%c${name} %c${type}`,
      'color: #26C6DA', 'color: #555',
      logValue,
      '| State:', logState);
  } else {
    _console(logger)(`\n${name} <<< ${type} >>>\n ${logValue}`, logState);
  }
}

let PipelineLoggerMiddleware = {
  type: 'pipeline',
  name: 'PipelineLoggerMiddleware',
  pre(state) {
    logPipeline(state);
    state.middlewareStack.length && _console('info')('PrePipeline', state);
    return state;
  },
  post(state) {
    state.middlewareStack.length && _console('info')('postPipeline', state);
    logPipeline(state, true);
    return state;
  },
  pipeMiddleware: PipeLoggerMiddleware
};

function logPipeline(state, isOutput=false) {
  if (!isOutput) {
    if (isBrowser) {
      _console('groupCollapsed')(`${state.name || 'Pipeline'} %cInput : `, 'color: #E91E63', state.value);
    } else {
      _console('group')(`${state.name || 'Pipeline'} <<<Input>>>  `, state.value);
    }
  } else {
    if (isBrowser) {
      _console('groupEnd')();
      _console('log')(
        `%c${state.name || 'Pipeline'} %cOutput: `,
        'font-weight: bold',
        'font-weight: bold;color: #E91E63',
        state.value);
    } else {
      _console('log')(`${state.name || 'Pipeline'} <<<Output>>> `, state.value);
    }
  }
}

function logBreak() {
  if (isBrowser) {
    _console('log')('%cPipeline Break!', 'color: #E91E63');
  } else {
    _console('log')('<<<Pipeline Break>>>');
  }
}

function _console(type='log') {
  if (!console) return;
  return (console[type] || console.log).bind(console); // eslint-disable-line no-console
}

export default PipelineLoggerMiddleware;
