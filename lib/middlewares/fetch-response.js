'use strict';

module.exports = async function (response, next) {
  response.json().then(next);
};