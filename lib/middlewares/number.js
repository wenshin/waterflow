export function makeRoundNumberHandler(digit=2) {
  return function roundNumberHandler(pipeState) {
    let actor = Math.pow(10, digit);
    pipeState = toNumberHandler(pipeState);
    return {...pipeState, value: Math.round(pipeState.value * actor) / actor};
  };
}

export function toNumberHandler(pipeState) {
  let value = Number(pipeState.value);
  if (!Number.isNaN(value)) {
    return {...pipeState, value};
  } else {
    throw new TypeError('[toNumberHandler] can not change value to Nubmer');
  }
}
