export default {
  middleware(name, type, {pre, post}) {
    return {name, type, pre, post};
  }
};
