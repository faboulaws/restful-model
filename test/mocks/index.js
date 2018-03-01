'use strict';

const [articleMocks, authorMocks, commentMocks, mediaMocks] = [require('./articles'), require('./authors'), require('./comments'), require('./media')];

const findBy = function (key, array, value) {
  return array.filter(item => item[key] === value);
};

const findMediaBy = (mediaType, array, contentId) => {
  return array.filter(item => (item.type === mediaType && item.content_id === contentId));
};

module.exports = {
  mocks: {articleMocks, authorMocks, commentMocks, mediaMocks},
  helpers: {
    getAuthorsById: findBy.bind(null, 'id', authorMocks),
    getCommentsByArticleId: findBy.bind(null, 'articleId', commentMocks),
    getImagesByArticleId: findMediaBy.bind(null, 'image', mediaMocks),
    getImagesById: findBy.bind(null, 'id', mediaMocks)
  },
  okResponse: (content) => ({ok: true, message: 'Success', content}),
  validationResponse: (error) => ({ok: false, message: 'Invalid', errors: [error], content: null})
};