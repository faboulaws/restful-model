'use strict';

const [articleMocks, authorMocks, commentMocks, mediaMocks, userMocks, userVisitMocks] =
    [require('./articles'), require('./authors'), require('./comments'), require('./media'), require('./users'), require('./user-visits')];

const findBy = function (key, array, value) {
  return array.filter(item => item[key] === value);
};

const findMediaBy = (mediaType, array, contentId) => {
  return array.filter(item => (item.type === mediaType && item.content_id === contentId));
};

module.exports = {
  mocks: {articleMocks, authorMocks, commentMocks, mediaMocks, userMocks, userVisitMocks},
  helpers: {
    getAuthorsById: findBy.bind(null, 'id', authorMocks),
    getCommentsByArticleId: findBy.bind(null, 'articleId', commentMocks),
    getImagesByArticleId: findMediaBy.bind(null, 'image', mediaMocks),
    getImagesById: findBy.bind(null, 'id', mediaMocks),
    getUserVisitsByUserId: findBy.bind(null, 'userId', userVisitMocks)
  },
  okResponse: (content) => ({ok: true, message: 'Success', content}),
  validationResponse: (error) => ({ok: false, message: 'Invalid', errors: [error], content: null})
};