'use strict';

const [articleMocks, authorMocks, commentMocks, imageMocks] = [require('./articles'), require('./authors'), require('./comments'), require('./article-images')];

const findBy = (key, array, value) => {
  return array.filter(item => item[key] === value);
};

module.exports = {
  mocks: {articleMocks, authorMocks, commentMocks, imageMocks},
  helpers: {
    getAuthorsById: findBy.bind(null, 'id', authorMocks),
    getCommentsByArticleId: findBy.bind(null, 'articleId', commentMocks),
    getImagesByArticleId: findBy.bind(null, 'articleId', imageMocks),
  },
  okResponse: (content) => ({ok: true, message: 'Success', content}),
  validationResponse: (error) => ({ok: false, message: 'Invalid', errors: [error], content: null})
};