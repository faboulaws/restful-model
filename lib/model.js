/* eslint class-methods-use-this: 0, no-plusplus: 0 , no-await-in-loop: 0, no-loop-func: 0 */

const Promise = require('bluebird');

function groupBy(array, key) {
  const hash = {};
  array.forEach((item) => {
    if (item[key]) {
      const keyValues = item[key];
      hash[keyValues] = hash[keyValues] || [];
      hash[keyValues].push(item);
    }
  });
  return hash;
}

function assignResult(data, foreignField) {
  return groupBy(data, foreignField);
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
  async query(params, include = [], context = {}) {
    this.validateIncludedModels(include);
    const { query, endpoint } = this.service.getEndpointAndQuery(this.path, params);
    const responseData = await this.service.get(`${endpoint}`, query, context);
    if (include.length) {
      // const includedEntities = await this._fetchIncludedEntities(responseData, include);
      // this._mergeIncludedEntities(responseData, include, includedEntities);
      await this.includeEntities(responseData, include);
    }
    return responseData;
  }

  async get(params, include = [], context = {}) {
    const { query, endpoint } = this.service.getEndpointAndQuery(`${this.path}/:id`, params);
    const responseData = await this.service.get(`${endpoint}`, Object.assign({}, query), context);
    if (include.length) {
      // const includedEntities = await this._fetchIncludedEntities([responseData], include);
      // this._mergeIncludedEntities([responseData], include, includedEntities);
      await this.includeEntities([responseData], include);
    }
    return responseData;
  }

  /**
   *
   * @param payload Object if the path has a placeholder it would be extracted from payload.
   *          The rest would be used in the query string
   * @returns {Promise.<TResult>}
   */
  async create(payload, query = {}, context = {}) {
    const { endpoint } = this.service.getEndpointAndQuery(this.path, payload);
    return this.service.post(endpoint, payload, query, context);
  }

  async update(params, payload, context = {}) {
    const { query, endpoint } = this.service.getEndpointAndQuery(`${this.path}/:id`, params);
    return this.service.put(endpoint, payload, query, context);
  }

  async delete(params, payload = {}, context = {}) {
    const { query, endpoint } = this.service.getEndpointAndQuery(`${this.path}/:id`, params);
    return this.service.delete(endpoint, payload, query, context);
  }

  async includeEntities(responseData, include) {
    const results = {};
    const localFieldValues = {};
    include.forEach((relationKey) => {
      const {
        foreignField, targetModel, localField, fetchMode, params, using,
      } = this.getRelation(relationKey);
      if (fetchMode === 'combined') { // one request needed
        // scan all models and retrieve target id - but only once
        localFieldValues[localField] = localFieldValues[localField]
            || responseData.map(mainEntity => mainEntity[localField]);
        // one query for all items with query string containing list of foreignField values
        results[relationKey] = this.service.getModel(targetModel).query({ [`${foreignField}[]`]: localFieldValues[localField] }).then(data => assignResult(data, foreignField));
      } else if (fetchMode === 'exclusive') {
        const fetchPromises = {};
        responseData.forEach((mainEntity) => {
          // one request per item
          const processedParams = this.processParams(params, mainEntity);
          fetchPromises[mainEntity[this.idField]] =
              this.service.getModel(targetModel)[using](processedParams);
        });
        results[relationKey] = Promise.props(fetchPromises);
      }
    });
    const finalRes = await Promise.props(results);
    this.addIncludedEntities(responseData, include, finalRes);
  }

  addIncludedEntities(responseData, include, results) {
    responseData.forEach((mainEntity) => {
      include.forEach((relationKey) => {
        const {
          type, localField, fetchMode, using,
        } = this.relations[relationKey];
        const localValue = fetchMode === 'combined' ? mainEntity[localField] : mainEntity[this.idField];
        if (using === 'query') {
          const currRelatedEntities = results[relationKey][localValue] || [];
          // eslint-disable-next-line no-param-reassign
          mainEntity[relationKey] = type === 'many' ? currRelatedEntities : (currRelatedEntities[0] || null);
        } else if (using === 'get') {
          const currRelatedEntity = results[relationKey][localValue] || null;
          // eslint-disable-next-line no-param-reassign
          mainEntity[relationKey] = type === 'many' ? ((currRelatedEntity && [currRelatedEntity]) || []) : (currRelatedEntity || null);
        }
      });
    });
  }

  hasRelation(modelName) {
    return Object.prototype.hasOwnProperty.call(this.relations, modelName);
  }

  getRelation(modelName) {
    const relation = this.relations[modelName];
    if (!relation) {
      throw new Error(`No relation defined with name "${modelName}". Please define hasOne|hasMany relation to "${this.name}" in model config of Model.`);
    }
    return relation;
  }

  validateIncludedModels(include) {
    include.forEach((relationKey) => {
      if (!this.hasRelation(relationKey)) {
        throw new Error(`Trying to use relation with field "${relationKey}" in query results of "${this.name}", but relation is not defined in modelConfig. Define using modelConfig.hasOne() or modelConfig.hasMany().`);
      }
      const { targetModel } = this.getRelation(relationKey);
      if (!this.service.hasModel(targetModel)) {
        throw new Error(`Undefined model "${targetModel}". Please define model before using.`);
      }
    });
  }

  processParams(params, mainEntity) {
    const processedParams = Object.assign({}, params);
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string' && value.indexOf('@') === 0 && Object.prototype.hasOwnProperty.call(mainEntity, value.substr(1))) {
        processedParams[key] = mainEntity[value.substr(1)];
      }
    });
    return processedParams;
  }
}

module.exports = Model;
