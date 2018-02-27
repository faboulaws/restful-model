const modelIndex = {
  models: {},
  addModel(key, model) {
    this.models[key] = model;
    return model;
  }
};

module.exports = modelIndex;