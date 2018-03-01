
# Restful Model


A module that abstracts the process of consuming a REST endpoint from both client and server side.

# Installing

~~~js
npm i restful-model;
~~~

# Usage

~~~js
const RestService = require('restful-model');
~~~

## Create a new service endpoint

~~~js
const userService = new RestService('http://example.com/api/v1');
const userModel = userService.registerModel('User', '/users');

// get all users
const usres = await userModel.query({view: 'thin'}); // HTTP GET http://example.com/api/v1/users?view=thin

// get user by ID
const user = await userModel.get({id: 1, view: 'full'}); // HTTP GET http://example.com/api/v1/users/1?view=full

// create user
const user = await userModel.create({full_name: "John Doe"}); // HTTP POST http://example.com/api/v1/users

// update user
const user = await userModel.update({id: 1}, {full_name: "John Doe"}); // HTTP PUT http://example.com/api/v1/users/1

// delete user
const result = await userModel.delete({id: 1}); // HTTP DELETE http://example.com/api/v1/users/1

~~~

Note: keys supplied in the first arguments for the above methods are used as params in path and query string. To use a param in the path give it the same name as the path placeholder. All other params would be used in query string.

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
const friends = await userModel.getFiends({id: 1, view: 'thin'});
// HTTP GET http://example.com/api/v1/users/1/friends?view=thin
~~~

## Model relationships

Relationship can be configured using the ResService.modelConfig() method. This method return an instance of ModelConfig class.

### hasOne() and hasMany()

These 2 methods define model relationship and have the same signature.

|Parameter|Description|Type|Default Value|
|--------|-----------|----|--------|
|name(required)|The name of the model |`string`||
|fieldName |The name of the field when joining models. Also used as a relation key|`string`||
|foreignField(optional) or config|*  When this argument is a string, it is used as the foreign key of the referenced model.<br> * When this argument is an object the next argument is skipped and all setting can be defined in it.<br>     Options:<br> -  **using** (string) define the method to call on the referenced model<br> - **localField(string)**<br> - **foreignField(string)**<br> - **fetchMode(string) (combined\|exclusive) default('combined')**<br> when *combined* one request is sent for all entries<br> when *exclusive* a request is made per entry<br> - **params (object)** used to define path and query params. Giving a param the same name as a placeholder in the path would inject it in the path. All other params would be used in query string. To use a param from an entry set it value to the name of the target field and prefix it by an @ sign  |`string` or `object`|'id'|
|localField(optional)| The local field in the relation. Ignored when foreignField is an object|`string[]`|'id'|


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
// Would get an article model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = await articleModel.get({id: i}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles/1
// HTTP GET http://example.com/api/v1/authors?id[]=<article.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<user.id>
~~~

### Get a multiple items

~~~js
// Would get articles. Each item would have model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = await articleModel.query({}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles
// HTTP GET http://example.com/api/v1/authors?id[]=<article1.authorId>&id[]=<article2.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<article1.id>&articleId[]=<article2.id>

~~~

##### Limitations

Request URL have limited length. When querying related models a request is sent to the referenced model endpoint with a query param for each item fetched. This could cause the URL to reach it limit.

## Model relationships - Advanced

~~~js
// set up
const articleConfig = RestService.modelConfig()
      .hasMany('Media', 'images', {
      fetchMode: 'exclusive', // exclusive | combined , exclusive = 1 request per entry, combined 1 request for all entry with query string filter
      params: {content_type: 'articles', media_type: 'images', content_id: '@id', size: 'thumb'}
    });
const articleModel = articleService.registerModel('Article', '/articles', articleConfig);
const authorModel = authorService.registerModel('Author', '/authors', RestService.modelConfig().hasMany('Article', 'post').hasOne('Media', 'photo', {
  fetchMode: 'exclusive',
  using: 'get',
  params: {content_type: 'authors', media_type: 'images', content_id: '@id', id: '@profilePhotoId', size: 'medium'}
}));
const media = mediaService.registerModel('Media', '/:content_type/:content_id/media/:media_type');
~~~

### Get a single item by calling .get() on referenced model (modelConfig.hasOne())

~~~js
const author = await authorModel.get({id: 107}, ['photo']);
// HTTP GET http://authors.example.com/api/v1/authors/107
// HTTP GET http://media.example.com/api/v1/authors/107/media/images/<author.profilePhotoId>

~~~

### Get a single item by calling .query() on referenced model (modelConfig.hasMany())

~~~js
const article = await articleModel.get({id: 1}, ['images']);
// HTTP GET http://authors.example.com/api/v1/authors/107
// HTTP GET http://media.example.com/api/v1/articles/1/media/images

~~~

### Get multiple items by calling .get() on referenced model (modelConfig.hasMany())

~~~js
const authors = await authorModel.query({}, ['photo']);
// One request for all authors
// HTTP GET http://authors.example.com/api/v1/authors/107
// One request for image per author
// HTTP GET http://media.example.com/api/v1/authors/<author1.id>/media/images/<author1.profilePhotoId>
// HTTP GET http://media.example.com/api/v1/authors/<author2.id>/media/images/<author2.profilePhotoId>
// ....

~~~


### Get multiple items by calling .query() on referenced model (modelConfig.hasMany())

~~~js
const article = await articleModel.query({}, ['images']);
// One request for all articles
// HTTP GET http://articles.example.com/api/v1/articles
// One request for images per articles
// HTTP GET http://media.example.com/api/v1/articles/<article1.id>/media/images
// HTTP GET http://media.example.com/api/v1/articles/<article2.id>/media/images
// ....

~~~


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
