export function createRefMap() {
  const map = {};

  return {
    set(id, el) {
      map[id] = el;
    },

    get(id) {
      return map[id];
    },

    delete(id) {
      delete map[id];
    },

    has(id) {
      return map.hasOwnProperty(id);
    },

    clear() {
      for (const key in map) delete map[key];
    },

    // OPTIONAL → ترجع لك كامل العناصر
    entries() {
      return Object.entries(map);
    }
  };
}





export function createObjectMap() {
  const obj = {};

  return {
    set(key, value) {
      obj[key] = value;
    },

    get(key) {
      return obj[key];
    },

    delete(key) {
      delete obj[key];
    },

    has(key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    },

    clear() {
      for (const k in obj) delete obj[k];
    },

    entries() {
      return Object.entries(obj);
    }
  };
}
