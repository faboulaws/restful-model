'use strict';

const RestService = require('../../../lib/index');
var githubService = new RestService('https://api.github.com');
var githubUser = githubService.registerModel('User', '/users', RestService.modelConfig().customActions({
  getRepos: {
    method: 'GET',
    path: '/:id/repos'
  }
}));
githubUser.get({id: 'facebook'}).then(function (result) {
  console.log(result, 'result');
});
githubUser.getRepos({id: 'facebook'}).then(function (result) {
  console.log(result, 'result');
});