"use strict";

const {expect, assert} = require('chai');
const sinon = require('sinon');
const RestService = require('../../lib');

describe('middlewares', () => {
  it('error handling', async () => {
    const service = new RestService('http://localhost:0001');
    service.useMiddlewares([
      function addInfoHeader() {
        throw new Error('Failure ...');
      },
      function reqAndRes(input, next) {
        next({ok: true, info: input.headers.info})
      }
    ]);

    const model = service.registerModel('Model', '/models');
    try {
      await model.get({});
      assert(false, 'Must fail when a middleware throws and error');
    } catch (e) {
      expect(e.message).to.eql('Failure ...');
    }
  });

  it('must use middleware added: sync', async () => {
    const service = new RestService('http://localhost:0001');
    service.useMiddlewares([
      function addInfoHeader(input, next) {
        input.headers.info = 'Info ...';
        next(input);
      },
      function reqAndRes(input, next) {
        next({ok: true, info: input.headers.info})
      }
    ]);

    const model = service.registerModel('Model', '/models');
    const res = await model.get({});
    expect(res).to.eql({ok: true, info: 'Info ...'});
  });

  it('must use middleware added: async', async () => {
    const service = new RestService('http://localhost:0001');
    service.useMiddlewares([
      function addInfoHeader(input, next) {
        Promise.resolve('Info ...').then((info) => {
          input.headers.info = info;
          next(input);
        });

      },
      function reqAndRes(input, next) {
        Promise.resolve(input.headers.info).then((info) => {
          next({ok: true, info})
        });
      }
    ]);

    const model = service.registerModel('Model', '/models');
    const res = await model.get({});
    expect(res).to.eql({ok: true, info: 'Info ...'});
  });

  it('must call last middleware only once', async () => {
    const service = new RestService('http://localhost:0050');
    let cache = {};
    const one = function one(input, next, resolve) {
      if (cache[input.url]) {
        resolve(cache[input.url]);
      } else {
        next({name: 'abc'}, input);
      }
    };
    const two = function one(input, next, resolve, context, xtra) {
      cache[xtra.url] = input;
      next(input);
    };
    const spyOne = sinon.spy(one);
    const spyTwo = sinon.spy(two);
    service.useMiddlewares([
      spyOne,
      spyTwo
    ]);

    const model = service.registerModel('Model', '/models');
    await model.get({});
    assert(spyOne.calledOnce, 'Must fail when a middleware throws and error');
    assert(spyTwo.calledOnce, 'Must fail when a middleware throws and error');

    await model.get({});
    assert(spyOne.calledTwice, 'Must fail when a middleware throws and error');
    assert(spyTwo.calledOnce, 'Must fail when a middleware throws and error');
  });

  it('must call last middleware only once (cache in context)', async () => {
    const service = new RestService('http://localhost:0050');
    let cache = {};
    const one = function one(input, next, resolve, {request: context}) {
      if (context.cache[input.url]) {
        resolve(context.cache[input.url]);
      } else {
        next({name: 'abc'}, input);
      }
    };
    const two = function one(input, next, resolve, {request: context}, xtra) {
      context.cache[xtra.url] = input;
      next(input);
    };
    const spyOne = sinon.spy(one);
    const spyTwo = sinon.spy(two);
    service.useMiddlewares([
      spyOne,
      spyTwo
    ]);

    const model = service.registerModel('Model', '/models');
    await model.get({}, [], {cache});
    assert(spyOne.calledOnce, 'Must fail when a middleware throws and error');
    assert(spyTwo.calledOnce, 'Must fail when a middleware throws and error');

    await model.get({}, [], {cache});
    assert(spyOne.calledTwice, 'Must fail when a middleware throws and error');
    assert(spyTwo.calledOnce, 'Must fail when a middleware throws and error');
  });
});