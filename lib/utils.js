import _isPlainObject from 'lodash/lang/isPlainObject';

export let strUtil = {
  capitalize(str) {
    return str
      ? str.replace(str[0], str[0].toUpperCase())
      : '';
  }
};

let utils = {
  pass: v => v,

  asyncPass: v => Promise.resolve(v),

  noop() {},

  keys(data) {
    if (Array.isArray(data)) {
      return data.map((item, index) => index);
    } else if (_isPlainObject(data)) {
      return Object.keys(data);
    } else {
      return [0];
    }
  },

  toArray(data) {
    let list;
    let keys = utils.keys(data);

    if (Array.isArray(data)) {
      list = [].concat(data);
    } else if (_isPlainObject(data)) {
      list = keys.map(key => data[key]);
    } else {
      list = [data];
    }
    return {list, keys};
  },

  strUtil
};

export default utils;
