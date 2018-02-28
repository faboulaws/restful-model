const {fetchResponse, fetchRequest} = require('./middlewares');
const modelIndex = require('./model-index');
const Model = require('./model');
const {hasOne, hasMany} = require('./relations');

function replaceParams(url, params) {
  let _url = url;
  Object.entries(params).forEach(([key, value]) => {
    _url = _url.replace(`:${key}`, value);
  });
  return _url;
}

function dynamicRequestFactory(httpMethod, path) {
  return async function (params, query, payload) {
    const fullPath = `${this.path}${path}`;
    const responseData = await
        this.service[httpMethod.toLowerCase()](`${this.service.getEndpoint(fullPath, params)}`, query, payload);
    return responseData;
  }
}


class ModelConfig {
  constructor() {
    this.relations = {};
    this.idField = 'id';
    this.actions = {};
    this.skippedMethods = [];
  }

  hasOne(targetModel, alias, ...args) {
    this.relations[alias] = hasOne(targetModel, ...args);
    return this;
  }

  hasMany(targetModel, alias, ...args) {
    this.relations[alias] = hasMany(targetModel, ...args);
    return this;
  }

  customActions(actions) {
    this.actions = actions;
    return this;
  }
}

class RestService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.middlewares = [
      fetchRequest,
      fetchResponse
    ];
  }

  reduceMiddlewares(initialInput, array) {
    return new Promise(async function (resolve, reject) {
      try {
        let result = initialInput;
        for (let i = 0; i < array.length; i++) {
          result = await new Promise(function (res) {
              array[i](result, res);
          })
        }
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  }

  useMiddlewares(middlewares) {
    this.middlewares = middlewares;
  }

  get(url, query = {}, headers = {}) {
    return this.reduceMiddlewares({method: "GET", url, query, headers}, this.middlewares);
  }

  post(url, payload, query = {}, headers = {}) {
    return this.reduceMiddlewares({method: "POST", url, payload, query, headers}, this.middlewares);
  }

  put(url, payload, query = {}, headers = {}) {
    return this.reduceMiddlewares({method: "PUT", url, payload, query, headers}, this.middlewares);
  }

  delete(url, payload, query = {}, headers = {}) {
    return this.reduceMiddlewares({method: "DELETE", url, payload, query, headers}, this.middlewares);
  }

  getEndpoint(path, params = {}) {
    return replaceParams(`${this.baseURL}${path}`, params);
  }

  getEndpointAndQuery(path, params) {
    let endpoint = `${this.baseURL}${path}`;
    const query = {};
    Object.entries(params).forEach(([key, value]) => {
      if (endpoint.indexOf(`:${key}`) !== -1) {
        endpoint = endpoint.replace(`:${key}`, value);
      } else {
        query[key] = value;
      }
    });
    return {endpoint: endpoint, query};
  }

  addModel({path, alias, relations}) {
    return modelIndex.addModel(alias, new Model(path, this, relations))
  }

  getModel(modelName) {
    const targetModel = modelIndex.models[modelName];
    if (!targetModel) {
      throw new Error(`Undefined model "${modelName}". Please define model before using.`);
    }
    return targetModel;
  }


  hasModel(modelName) {
    return modelIndex.models.hasOwnProperty(modelName);
  }

  registerModel(name, path, modelConfig) {
    const mdlCfg = modelConfig || new ModelConfig();

    class CustomModel extends Model {
    }

    Object.entries(mdlCfg.actions).forEach(([methodName, {method: httpMethod, path}]) => {
      Object.defineProperty(CustomModel.prototype, methodName, {
        value: dynamicRequestFactory(httpMethod, path)
      });
    });

    return modelIndex.addModel(name, new CustomModel(name, path, this, mdlCfg));
  }

  static modelConfig() {
    return new ModelConfig();
  }
}

Object.defineProperty(RestService, 'defaultMiddlewares', {value: {fetchResponse, fetchRequest}});

module.exports = RestService;