const {expect, assert} = require('chai');
const nock = require('nock');
const sinon = require('sinon');

const RestService = require('../../lib');
const {
  mocks: {articleMocks, authorMocks, commentMocks, userMocks, userVisitMocks},
  helpers: {getAuthorsById, getCommentsByArticleId, getImagesByArticleId, getImagesById, getUserVisitsByUserId}
} = require('../mocks');

const articleService = new RestService('http://localhost:0001');
const commentService = new RestService('http://localhost:0002');
const authorService = new RestService('http://localhost:0003');
const mediaService = new RestService('http://localhost:0004');
//
const userService = new RestService('http://user.service.com');

const articleConfig = RestService.modelConfig()
    .hasOne('Author', 'author', 'id', 'authorId')
    .hasMany('Comment', 'comments', 'articleId')
    .hasMany('Media', 'images', {
      fetchMode: 'exclusive', // exclusive | combined , exclusive = 1 request per entry, combined 1 request for all entry with query string filter
      params: {content_type: 'articles', media_type: 'images', content_id: '@id', size: 'thumb'}
    });
const articles = articleService.registerModel('Article', '/articles', articleConfig);
const comments = commentService.registerModel('Comment', '/comments');
const authors = authorService.registerModel('Author', '/authors', RestService.modelConfig().hasMany('Article', 'post').hasOne('Media', 'photo', {
  fetchMode: 'exclusive',
  using: 'get',
  params: {content_type: 'authors', media_type: 'images', content_id: '@id', id: '@profilePhotoId', size: 'medium'}
}));
const media = mediaService.registerModel('Media', '/:content_type/:content_id/media/:media_type');
const users = userService.registerModel('User', '/users', RestService.modelConfig().setIdField('userId').hasMany('Visit', 'visits', 'userId', 'userId'));
const userVisits = userService.registerModel('Visit', '/visits');

describe('Rest Tests', () => {
  afterEach(() => {
    nock.cleanAll()
  });

  describe('relations', () => {
    it('Should fail when relation defined on non-existent model', async () => {
      const articles2 = articleService.registerModel('Article2', '/articles2', RestService.modelConfig().hasMany('Tag', 'tag'));
      try {
        await  articles2.query({}, ['tag']);
        assert(false, 'Must fail');
      } catch (e) {
        expect(e.message).to.eql('Undefined model "Tag". Please define model before using.');
      }
    });

    it('Should fail including model not defined in relation', async () => {
      const articles3 = articleService.registerModel('Article3', '/articles3');
      try {
        await  articles3.query({}, ['expert']);
        assert(false, 'Must fail');
      } catch (e) {
        expect(e.message).to.eql('Trying to use relation with field "expert" in query results of "Article3", but relation is not defined in modelConfig. Define using modelConfig.hasOne() or modelConfig.hasMany().');
      }
    });
  });

  describe('query', () => {
    beforeEach(() => {
      nock('http://localhost:0001')
          .get('/articles')
          .reply(200, articleMocks);

      nock('http://localhost:0003')
          .get('/authors')
          .query({id: [107, 56, 50]})
          .reply(200, authorMocks);

      nock('http://localhost:0003')
          .get('/authors')
          .reply(200, authorMocks);

      nock('http://localhost:0002')
          .get('/comments')
          .query({articleId: [1, 2, 3]})
          .reply(200, commentMocks);

      // media
      nock('http://localhost:0004')
          .get('/articles/1/media/images')
          .query({size: 'thumb'})
          .reply(200, getImagesByArticleId(1));

      nock('http://localhost:0004')
          .get('/articles/2/media/images')
          .query({size: 'thumb'})
          .reply(200, getImagesByArticleId(2));

      nock('http://localhost:0004')
          .get('/articles/3/media/images')
          .query({size: 'thumb'})
          .reply(200, getImagesByArticleId(3));

      // author media
      nock('http://localhost:0004')
          .get('/authors/56/media/images/20')
          .query({size: 'medium'})
          .reply(200, getImagesById(authorMocks[0].profilePhotoId)[0]);

      nock('http://localhost:0004')
          .get('/authors/107/media/images/590')
          .query({size: 'medium'})
          .reply(200, getImagesById(authorMocks[1].profilePhotoId)[0]);

      // users
      nock('http://user.service.com')
          .get('/users')
          .reply(200, userMocks);

      nock('http://user.service.com')
          .get('/visits')
          .query({userId: [46, 97]})
          .reply(200, userVisitMocks);
    });

    it('return articles', async () => {
      const result = await  articles.query({});
      expect(result).to.eql(articleMocks);
    });

    it('returns articles with single author', async () => {
      const result = await  articles.query({}, ['author']);
      result.forEach((article) => {
        expect(article).to.eql(Object.assign({}, article, {'author': getAuthorsById(article.authorId)[0] || null}));
      });
    });

    it('returns articles with comments array', async () => {
      const result = await  articles.query({}, ['comments']);
      result.forEach((article) => {
        expect(article).to.eql(Object.assign({}, article, {'comments': getCommentsByArticleId(article.id)}));
      });
    });

    it('returns articles with media array', async () => {
      const result = await  articles.query({}, ['images']);
      result.forEach((article) => {
        expect(article).to.eql(Object.assign({}, article, {'images': getImagesByArticleId(article.id)}));
      });
    });

    it('returns authors with photo', async () => {
      const result = await  authors.query({}, ['photo']);
      result.forEach((article) => {
        expect(article).to.eql(Object.assign({}, article, {'photo': getImagesById(article.profilePhotoId)[0]}));
      });
    });

    it('returns users with visits', async () => {
      const result = await  users.query({}, ['visits']);
      result.forEach((user) => {
        expect(user).to.eql(Object.assign({}, user, {'visits': getUserVisitsByUserId(user.userId)}));
      });
    });
  });

  describe('get', () => {
    beforeEach(() => {
      nock('http://localhost:0001')
          .get('/articles/1')
          .reply(200, articleMocks[0]);

      nock('http://localhost:0003')
          .get('/authors')
          .query({id: 107})
          .reply(200, getAuthorsById(107));

      nock('http://localhost:0003')
          .get('/authors/107')
          .reply(200, getAuthorsById(107)[0]);

      nock('http://localhost:0002')
          .get('/comments')
          .query({articleId: 1})
          .reply(200, getCommentsByArticleId(1));

      nock('http://localhost:0004')
          .get('/articles/1/media/images')
          .query({size: 'thumb'})
          .reply(200, getImagesByArticleId(1));

      // author media
      nock('http://localhost:0004')
          .get('/authors/107/media/images/590')
          .query({size: 'medium'})
          .reply(200, getImagesById(authorMocks[1].profilePhotoId)[0]);

      // users
      nock('http://user.service.com')
          .get('/users/46')
          .reply(200, userMocks[0]);

      nock('http://user.service.com')
          .get('/visits')
          .query({userId: 46})
          .reply(200, getUserVisitsByUserId(46));
    });

    it('return 1 article', async () => {
      const article = await  articles.get({id: 1});
      expect(article).to.eql(articleMocks[0]);
    });

    it('returns 1 article with single author', async () => {
      const article = await  articles.get({id: 1}, ['author']);
      expect(article).to.eql(Object.assign({}, article, {'author': getAuthorsById(article.authorId)[0] || null}));
    });

    it('returns 1 article with comments array', async () => {
      const article = await  articles.get({id: 1}, ['comments']);
      expect(article).to.eql(Object.assign({}, article, {'comments': getCommentsByArticleId(article.id)}));
    });

    it('returns 1 article with media array', async () => {
      const article = await  articles.get({id: 1}, ['images']);
      expect(article).to.eql(Object.assign({}, article, {'images': getImagesByArticleId(article.id)}));
    });

    it('returns 1 author with photo', async () => {
      const author = await  authors.get({id: 107}, ['photo']);
      expect(author).to.eql(Object.assign({}, author, {'photo': getImagesById(author.profilePhotoId)[0]}));
    });

    it('returns 1 user with visits', async () => {
      const author = await  users.get({id: 46}, ['visits']);
      expect(author).to.eql(Object.assign({}, author, {'visits': getUserVisitsByUserId(author.userId)}));
    });
  });

  describe('create', () => {
    const newArticle = {name: 'Test', title: "Article 4", authorId: 1};
    const createArticle = Object.assign({}, {id: 4}, newArticle);
    const invalidArticle = {name: 'Test'};
    const errorResponse = {title: "Required", authorId: 1};
    beforeEach(() => {
      nock('http://localhost:0001')
          .post('/articles', newArticle)
          .reply(201, createArticle);

      nock('http://localhost:0001')
          .post('/articles', invalidArticle)
          .reply(422, errorResponse);
    });

    it('send a post request with payload', async () => {
      const article = await  articles.create(newArticle);
      expect(article).to.eql(createArticle);
    });

    it('send a post request with invalid payload', async () => {
      const article = await  articles.create(invalidArticle);
      expect(article).to.eql(errorResponse);
    });
  });


  describe('update', () => {
    const updateArticle = Object.assign({}, articleMocks[0], {title: 'abc'});

    const invalidArticle = {name: 'Test'};
    const errorResponse = {title: "Required", authorId: 1};
    beforeEach(() => {
      nock('http://localhost:0001')
          .put('/articles/1', updateArticle)
          .reply(200, updateArticle);

      nock('http://localhost:0001')
          .put('/articles/100', invalidArticle)
          .reply(422, errorResponse);
    });

    it('send a put request with payload', async () => {
      const article = await  articles.update({id: 1}, updateArticle);
      expect(article).to.eql(updateArticle);
    });

    it('send a put request with invalid payload', async () => {
      const article = await  articles.update({id: 100}, invalidArticle);
      expect(article).to.eql(errorResponse);
    });
  });

  describe('delete', () => {
    const deletedArticle = Object.assign({}, articleMocks[0], {deletedAt: (new Date()).toISOString()});

    const errorResponse = {ok: false};
    beforeEach(() => {
      nock('http://localhost:0001')
          .delete('/articles/1',)
          .reply(200, deletedArticle);

      nock('http://localhost:0001')
          .delete('/articles/100')
          .reply(404, errorResponse);
    });

    it('send a delete request with payload', async () => {
      const article = await  articles.delete({id: 1});
      expect(article).to.eql(deletedArticle);
    });

    it('send a delete request with invalid payload', async () => {
      const article = await  articles.delete({id: 100});
      expect(article).to.eql(errorResponse);
    });
  });

  describe('custom endpoints', () => {
    const model = articleService.registerModel('Articles4', '/articles4', RestService.modelConfig().customActions({
      getImages: {
        method: 'get',
        path: '/:id/images',
      },
      createArticleImage: {
        method: 'post',
        path: '/:id/images'
      },
      updateArticleImage: {
        method: 'put',
        path: '/:id/images'
      },
      deleteArticleImage: {
        method: 'delete',
        path: '/:id/images'
      }
    }));

    const lastMiddleware = function (input, next) {
      next(input);
    };
    const middlewareSpy = sinon.spy(lastMiddleware);

    articleService.useMiddleware(middlewareSpy);

    afterEach(() => {
      middlewareSpy.resetHistory();
    });

    describe('GET', () => {
      beforeEach(() => {
        nock('http://localhost:0001')
            .get('/articles4/1/images')
            .reply(200, getImagesByArticleId(1));

        nock('http://localhost:0001')
            .get('/articles4/1/images')
            .query({view: 'thin'})
            .reply(200, getImagesByArticleId(1));

        nock('http://localhost:0001')
            .get('/articles4/10/images')
            .reply(200, getImagesByArticleId(3));
      });

      it('must work', async () => {
        const result = await model.getImages({id: 1});
        expect(result).to.eql(getImagesByArticleId(1));
      });

      it('must add query params', async () => {
        const result = await model.getImages({id: 1, view: 'thin'});
        expect(result).to.eql(getImagesByArticleId(1));
      });

      it('must pass context to middlewares', async () => {
        const context = {contextData: 1};
        const result = await model.getImages({id: 10}, context);
        expect(result).to.eql(getImagesByArticleId(3));
        const args = middlewareSpy.args[0];
        expect(args[3]).to.eql({request: context});
      });
    });

    describe('POST', () => {
      beforeEach(() => {
        nock('http://localhost:0001')
            .post('/articles4/1/images')
            .query({view: 'thin'})
            .reply(200, getImagesByArticleId(2));
      });

      it('must send request with payload, query & context', async () => {
        const context = {contextTestData: 'abc'};
        const result = await model.createArticleImage({id: 1}, {view: 'thin'}, context);
        expect(result).to.eql(getImagesByArticleId(2));
        const args = middlewareSpy.args[0];
        expect(args[3]).to.eql({request: context});
      });
    });

    describe('PUT', () => {
      beforeEach(() => {
        nock('http://localhost:0001')
            .put('/articles4/11/images')
            .query({view: 'large'})
            .reply(200, getImagesByArticleId(1));
      });

      it('must send request with payload, query & context', async () => {
        const context = {contextTestData: 'xyz'};
        const result = await model.updateArticleImage({id: 11, view: 'large'}, {}, context);
        expect(result).to.eql(getImagesByArticleId(1));
        const args = middlewareSpy.args[0];
        expect(args[3]).to.eql({request: context});
      });
    });

    describe('DELETE', () => {
      beforeEach(() => {
        nock('http://localhost:0001')
            .delete('/articles4/12/images')
            .query({view: 'medium'})
            .reply(200, getImagesByArticleId(3));
      });

      it('must send request with payload, query & context', async () => {
        const context = {contextTestData: 'xyz'};
        const result = await model.deleteArticleImage({id: 12, view: 'medium'}, {}, context);
        expect(result).to.eql(getImagesByArticleId(3));
        const args = middlewareSpy.args[0];
        expect(args[3]).to.eql({request: context});
      });
    });
  });
});