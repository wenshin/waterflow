export function BreakPipeline(message) {
  this.name = 'BreakPipeline';
  this.message = message || '';
}

BreakPipeline.prototype = Error.prototype;

export default {BreakPipeline};
