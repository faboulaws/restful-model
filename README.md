
# Restful Model


A module that abstracts the process of consuming a REST endpoint from both client and server side.

# Usage

~~~js
const RestService = require('restful-model');
~~~

## Create a new service endpoint

~~~js
const userService = new RestService('http://example.com/api/v1');
const userModel = userService.registerModel('User', '/users');

// get all users
userModel.query({}); // HTTP GET http://example.com/api/v1/users

// get user by ID
userModel.get({id: 1}); // HTTP GET http://example.com/api/v1/users/1

// create user
userModel.create({full_name: "John Doe"}); // HTTP POST http://example.com/api/v1/users

// update user
userModel.update({id: 1}, {full_name: "John Doe"}); // HTTP PUT http://example.com/api/v1/users/1


// delete user
userModel.delete({id: 1}); // HTTP DELETE http://example.com/api/v1/users/1

~~~


## Custom endpoints

Use RestService model config to configure models

~~~js
const userService = new RestService('http://example.com/api/v1');
const modelConfig = RestService.modelConfig().customActions({
                            getFiends: {
                              method: 'get',
                              path: '/:id/friends',
                            }
                          });
const userModel = userService.registerModel('User', '/users', modelConfig);
const friends = userModel.getFiends({id: 1});

~~~

## Model relationships

~~~js
// define services
const articleService = new RestService('http://articles.example.com/api/v1');
const authorService = new RestService('http://authors.example.com/api/v1');
const commentService = new RestService('http:/comments.example.com/api/v1');

// define models
const modelConfig = RestService.modelConfig()
                         .hasMany('Comments', 'comments', 'articleId')
                         .hasOne('Author', 'author', 'id', 'authorId');
const articleModel = articleService.registerModel('Article', '/articles', modelConfig);
const authorModel = authorService.registerModel('Author', '/authors');
const commentModel = commentService.registerModel('Comment', '/comments');
~~~~

### Get a single item
~~~js
// would get a article model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = articleModel.get({id: i}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles/1
// HTTP GET http://example.com/api/v1/authors?id[]=<article.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<user.id>
~~~

### Get a multiple items

~~~js
// would get a articles an eah item would have  model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = articleModel.query({id: i}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles
// HTTP GET http://example.com/api/v1/authors?id[]=<article1.authorId>&id[]=<article2.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<article1.id>&articleId[]=<article2.id>

~~~

### Limitations

There is a limited length to requests queries large result set would fail.


## Middlewares

Middlewares are used to process server request. When defining middlewares the order of middlewares is important:
- The first middleware receive the initial input. The initial input is the request options object.
- The last middleware must return the final data of the response.

### Defaults middlewares

There are two default middlewares, a Request middleware and a Response middleware.When using the default middlewares, processing a request has the following steps
- The first middleware receives the request options makes a request then passes the response to the next middleware
- The Response middleware receives the response as input and return the response data.

### Writing middleware

Middleware function take 2 arguments

- The first argument is the input. The input value would depend on the preceding middleware. It can be a request options a response or anything else.
The first middleware always receives the request options.

- The second argument is a callback used to deliver the middleware result to the next middleware

~~~js

function(input, next) {
 const result = process(input); //.... do something with input
 next(result)
}
~~~

#### Example: Adding Basic Authentication middleware

~~~js
const RestService = require('restful-model');
const {fetchRequest, fetchResponse} = RestService.defaultMiddlewares;

const userService = new RestService('http://example.com/api/v1');

async function addBasicAuthHeader (httpRequestOptions, next) {
  const {username, password} = await getAuthData();// imaginary function
  const hash = base64Encode(`${username}:${password}`); // imaginary function
  // add authorisation header
  httpRequestOptions.headers['Authorization'] = `Basic ${hash}`;
  // pass request options to the next middleware (fetchRequest)
  next(httpRequestOptions);
}

userService.useMiddlewares([addBasicAuthHeader, fetchRequest, fetchResponse]);
~~~
