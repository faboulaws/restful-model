const {expect, assert} = require('chai');
const nock = require('nock');

const RestService = require('../../lib');
const {mocks: {articleMocks, authorMocks, commentMocks}, helpers: {getAuthorsById, getCommentsByArticleId, getImagesByArticleId}} = require('../mocks');

const articleService = new RestService('http://localhost:0001');
const commentService = new RestService('http://localhost:0002');
const authorService = new RestService('http://localhost:0003');

const articles = articleService.registerModel('Article', '/articles', RestService.modelConfig().hasOne('Author', 'author', 'id', 'authorId').hasMany('Comment', 'comments', 'articleId'));
const comments = commentService.registerModel('Comment', '/comments');
const authors = authorService.registerModel('Author', '/authors', RestService.modelConfig().hasMany('Article', 'post'));

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

      nock('http://localhost:0002')
          .get('/comments')
          .query({articleId: [1, 2, 3]})
          .reply(200, commentMocks);
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

      nock('http://localhost:0002')
          .get('/comments')
          .query({articleId: 1})
          .reply(200, getCommentsByArticleId(1));
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
    before(() => {
      nock('http://localhost:0001')
          .get('/articles4/1/images')
          .reply(200, getImagesByArticleId(1));
    });

    it('GET must work', async () => {
      const model = articleService.registerModel('Articles4', '/articles4', RestService.modelConfig().customActions({
        getImages: {
          method: 'get',
          path: '/:id/images',
        }
      }));
      const result = await model.getImages({id: 1});
      expect(result).to.eql(getImagesByArticleId(1));
    });
  });
});