/* eslint class-methods-use-this: 0, no-plusplus: 0 , no-await-in-loop: 0, no-loop-func: 0 */


const { fetchResponse, fetchRequest } = require('./middlewares');
const modelIndex = require('./model-index');
const Model = require('./model');
const { hasOne, hasMany } = require('./relations');

function replaceParams(url, params) {
  let processedUrl = url;
  Object.entries(params).forEach(([key, value]) => {
    processedUrl = processedUrl.replace(`:${key}`, value);
  });
  return processedUrl;
}

function dynamicRequestFactory(httpMethod, path) {
  return async function makeRequest(params, query, payload) {
    const fullPath = `${this.path}${path}`;
    const responseData = await
      this.service[httpMethod.toLowerCase()](`${this.service.getEndpoint(fullPath, params)}`, query, payload);
    return responseData;
  };
}

class ModelConfig {
  constructor() {
    this.relations = {};
    this.idField = 'id';
    this.actions = {};
  }

  hasOne(targetModel, alias, ...rest) {
    this.relations[alias] = hasOne(targetModel, ...rest);
    return this;
  }

  hasMany(targetModel, alias, ...rest) {
    this.relations[alias] = hasMany(targetModel, ...rest);
    return this;
  }

  customActions(actions) {
    this.actions = actions;
    return this;
  }

  setIdField(idField) {
    this.idField = idField;
    return this;
  }
}

function nextMiddleware(resolve, result, ...args) {
  resolve({ result, args, resolved: false });
}

function resolveRequest(resolve, result, ...args) {
  resolve({ result, args, resolved: true });
}

class RestService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.middlewares = [
      fetchRequest,
      fetchResponse,
    ];
  }

  reduceMiddlewares(initialInput, array, context) {
    return new Promise((async (resolve, reject) => {
      try {
        let result = { result: initialInput, resolved: false };
        for (let i = 0; i < array.length; i++) {
          result = await new Promise(((res) => {
            array[i](
              result.result,
              nextMiddleware.bind(null, res),
              resolveRequest.bind(null, res),
              context,
              ...(result.args || []),
            );
          }));
          if (result.resolved) {
            resolve(result.result);
            break;
          }
        }
        resolve(result.result);
      } catch (e) {
        reject(e);
      }
    }));
  }

  useMiddlewares(middlewares) {
    this.middlewares = middlewares;
  }

  buildContext(requestContext) {
    return {
      request: requestContext, // todo: add support for global context
    };
  }

  get(url, query = {}, context = {}) {
    return this.reduceMiddlewares({
      method: 'GET', url, query, headers: {},
    }, this.middlewares, this.buildContext(context));
  }

  post(url, payload, query = {}, context = {}) {
    return this.reduceMiddlewares({
      method: 'POST', url, payload, query, headers: {},
    }, this.middlewares, this.buildContext(context));
  }

  put(url, payload, query = {}, context = {}) {
    return this.reduceMiddlewares({
      method: 'PUT', url, payload, query, headers: {},
    }, this.middlewares, this.buildContext(context));
  }

  delete(url, payload, query = {}, context = {}) {
    return this.reduceMiddlewares({
      method: 'DELETE', url, payload, query, headers: {},
    }, this.middlewares, this.buildContext(context));
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
    return { endpoint, query };
  }

  addModel({ path, alias, relations }) {
    return modelIndex.addModel(alias, new Model(path, this, relations));
  }

  getModel(modelName) {
    const targetModel = modelIndex.models[modelName];
    if (!targetModel) {
      throw new Error(`Undefined model "${modelName}". Please define model before using.`);
    }
    return targetModel;
  }


  hasModel(modelName) {
    return Object.prototype.hasOwnProperty.call(modelIndex.models, modelName);
  }

  registerModel(name, endpointPath, modelConfig) {
    const mdlCfg = modelConfig || new ModelConfig();

    class CustomModel extends Model {
    }

    Object.entries(mdlCfg.actions).forEach(([methodName, { method: httpMethod, path }]) => {
      Object.defineProperty(CustomModel.prototype, methodName, {
        value: dynamicRequestFactory(httpMethod, path),
      });
    });

    return modelIndex.addModel(name, new CustomModel(name, endpointPath, this, mdlCfg));
  }

  static modelConfig() {
    return new ModelConfig();
  }
}

Object.defineProperty(RestService, 'defaultMiddlewares', { value: { fetchResponse, fetchRequest } });

module.exports = RestService;
