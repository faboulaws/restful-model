function groupBy(array, key) {
  const hash = {};
  array.forEach(item => {
    if (item[key]) {
      const keyValues = item[key];
      hash[keyValues] = hash [keyValues] || [];
      hash[keyValues].push(item);
    }

  });
  return hash;
}


class Model {
  constructor(name, path, service, config) {
    this.name = name;
    this.path = path;
    this.service = service;
    this.idField = config.idField;
    this.relations = config.relations;
  }

  /**
   *
   * @param params Object route and query params
   * @param include array string array of related Model to include in result
   * @returns {Promise.<TResult>}
   */
  async query(params, include = []) {
    this.validateIncludedModels(include);
    const {query, endpoint} = this.service.getEndpointAndQuery(this.path, params);
    const responseData = await this.service.get(`${endpoint}`, query);
    if (include.length) {
      const includedEntities = await this._getIncludedEntities(responseData, include);
      this._mergeIncludedEntities(responseData, include, includedEntities);
    }
    return responseData;
  }

  async get(params, include = []) {// example {articleId:1, id:2}
    const {query, endpoint} = this.service.getEndpointAndQuery(`${this.path}/:id`, params);
    const responseData = await this.service.get(`${endpoint}`, Object.assign({}, query));
    if (include.length) {
      const includedEntities = await this._getIncludedEntities([responseData], include);
      this._mergeIncludedEntities([responseData], include, includedEntities);
    }
    return responseData;
  }

  /**
   *
   * @param payload Object if path has a placeholder it would be extracted from payload
   * @returns {Promise.<TResult>}
   */
  async create(payload, query = {}) {// example {}
    const {endpoint} = this.service.getEndpointAndQuery(this.path, payload);
    return this.service.post(endpoint, payload, query);
  }

  async update(params, payload) {
    const {query, endpoint} = this.service.getEndpointAndQuery(`${this.path}/:id`, params);
    return this.service.put(endpoint, payload, query);
  }

  async delete(params, payload = {}) {
    const {query, endpoint} = this.service.getEndpointAndQuery(`${this.path}/:id`, params);
    return this.service.delete(endpoint, payload, query);
  }

  async _getIncludedEntities(responseData, include) {
    const ids = responseData.map(item => item[this.idField]);
    const getRelatedModelResults = await Promise.all(include.map(relationKey => {
      const {foreignKey, targetModel} = this.getRelation(relationKey);
      return this.service.getModel(targetModel).query({[`${foreignKey}[]`]: ids});
    }));
    const results = {};
    include.forEach((relationKey, index) => {
      results[relationKey] = getRelatedModelResults[index];
    });
    return results;
  }

  _mergeIncludedEntities(responseData, include, includedEntities) {
    const hash = {};
    Object.entries(includedEntities).forEach(([relationKey, relatedEntities]) => {
      const {foreignKey} = this.relations[relationKey];
      hash[relationKey] = groupBy(relatedEntities, foreignKey);
    });
    responseData.forEach(mainEntity => {
      include.forEach(relationKey => {
        const {type} = this.relations[relationKey];
        const mainEntityId = mainEntity[this.idField];
        const currRelatedEntities = hash[relationKey][mainEntityId] || [];
        mainEntity[relationKey] = type === 'many' ? currRelatedEntities : (currRelatedEntities[0] || null);
      });
    });
  }

  hasRelation(modelName) {
    return this.relations.hasOwnProperty(modelName);
  }

  getRelation(modelName) {
    const relation = this.relations[modelName];
    if (!relation) {
      throw new Error(`No relation defined with name "${modelName}". Please define hasOne|hasMany relation to "${this.name}" in model config of Model.`);
    }
    return relation;
  }

  validateIncludedModels(include) {
    include.forEach(relationKey => {
      if (!this.hasRelation(relationKey)) {
        throw new Error(`Trying to use relation with field "${relationKey}" in query results of "${this.name}", but relation is not defined in modelConfig. Define using modelConfig.hasOne() or modelConfig.hasMany().`);
      }
      const {targetModel} = this.getRelation(relationKey);
      if (!this.service.hasModel(targetModel)) {
        throw new Error(`Undefined model "${targetModel}". Please define model before using.`);
      }
    });
  }
}


module.exports = Model;