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
