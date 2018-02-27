'use strict';

module.exports = async function (requestOptions, next) {
  requestOptions.headers['Authorization']
  next(requestOptions);
};