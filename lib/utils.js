import _isPlainObject from 'lodash/lang/isPlainObject';

export default {
  values(data) {
    let list;
    let keys = [];

    if (Array.isArray(data)) {
      keys = data.map((item, index) => index);
      list = [].concat(data);
    } else if (_isPlainObject(data)) {
      keys = Object.keys(data);
      list = keys.map(key => data[key]);
    }
    return {list, keys};
  }
};
