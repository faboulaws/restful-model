const {expect, assert} = require('chai');
const nock = require('nock');

const RestService = require('../../lib');

describe('middlewares', () => {
  it('error handling', async () => {
    const service = new RestService('http://localhost:0001');
    service.useMiddlewares([
      function addInfoHeader(input, next) {
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

});