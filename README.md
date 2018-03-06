
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
const users = await userModel.query({view: 'thin'}); // HTTP GET http://example.com/api/v1/users?view=thin

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

Relationship can be configured using the RestService.modelConfig() method. This method return an instance of ModelConfig class.

### hasOne() and hasMany()

These 2 methods of the ModelConfig class define model relationship and have the same signature.

|Parameter|Description|Type|Default Value|
|--------|-----------|----|--------|
|name(required)|The name of the model |`string`||
|fieldName |The name of the field when joining models. Also used as a relation key|`string`||
|foreignField(optional) or config|*  When this argument is a string, it is used as the foreign key of the referenced model.<br> * When this argument is an object the next argument is skipped and all setting can be defined in it.<br>     Options:<br> -  **using** (string) define the method to call on the referenced model<br> - **localField(string)**<br> - **foreignField(string)**<br> - **fetchMode(string) (combined\|exclusive) default('combined')**<br> when *combined* one request is sent for all entries<br> when *exclusive* a request is made per entry<br> - **params (object)** used to define path and query params. Giving a param the same name as a placeholder in the path would inject it in the path. All other params would be used in query string. To use a param from an entry set it value to the name of the target field and prefix it by an @ sign  |`string` or `object`|'id'|
|localField(optional)| The local field in the relation. Ignored when foreignField is an object|`string`|'id'|

### Model relationships: Configuration Example

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

### Model relationship: Example use cases with combined fetchMode

#### Get a single item (article) and fetch related entities (author, comment)
~~~js
// Would get an article model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = await articleModel.get({id: i}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles/1
// HTTP GET http://example.com/api/v1/authors?id[]=<article.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<user.id>
~~~

#### Get a multiple items (article) and fetch related entities (author, comment)

~~~js
// Would get articles. Each item would have model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = await articleModel.query({}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles
// HTTP GET http://example.com/api/v1/authors?id[]=<article1.authorId>&id[]=<article2.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<article1.id>&articleId[]=<article2.id>

~~~

###### Limitations

The examples above use a fetching of related entities with **fetchMode** of type **combined** ([see](##model-relationships)). This means that a single request is made to access the related entities of retrieved items.
In the above example, a single request is made to retrieve all authors related to all collected articles. This single request is made with all author IDs in a query string.
However, this could cause lengthy Request URLs. And since URL have limited size (depends on the server and browser), request will large data set would fail. It is advised to use it only on small data set.

## Model relationships: Example use cases with exclusive fetchMode

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

#### Get a single item with related entity (hasOne)

~~~js
const author = await authorModel.get({id: 107}, ['photo']);
// HTTP GET http://authors.example.com/api/v1/authors/107
// HTTP GET http://media.example.com/api/v1/authors/107/media/images/<author.profilePhotoId>

~~~

#### Get a single item with related entities (hasMany)

~~~js
const article = await articleModel.get({id: 1}, ['images']);
// HTTP GET http://authors.example.com/api/v1/authors/107
// HTTP GET http://media.example.com/api/v1/articles/1/media/images

~~~

#### Get multiple items with related entities (hasOne)

~~~js
const authors = await authorModel.query({}, ['photo']);
// One request for all authors
// HTTP GET http://authors.example.com/api/v1/authors/107
// One request for image per author
// HTTP GET http://media.example.com/api/v1/authors/<author1.id>/media/images/<author1.profilePhotoId>
// HTTP GET http://media.example.com/api/v1/authors/<author2.id>/media/images/<author2.profilePhotoId>
// ....

~~~

#### Get multiple items with related entities (hasMany)

~~~js
const article = await articleModel.query({}, ['images']);
// One request for all articles
// HTTP GET http://articles.example.com/api/v1/articles
// One request for images per articles
// HTTP GET http://media.example.com/api/v1/articles/<article1.id>/media/images
// HTTP GET http://media.example.com/api/v1/articles/<article2.id>/media/images
// ....

~~~

##### Limitations
A request is made for each item. Consider using caching where relevant.

## Middlewares

Middlewares are used to process server requests. When defining middlewares the order of middlewares is important:
- The first middleware receive the initial input. The initial input is the request options object.
- The last middleware must return the final data of the response.

### Defaults middlewares

There are two default middlewares, a Request middleware and a Response middleware.When using the default middlewares, processing a request has the following steps
- The first middleware receives the request options makes a request then passes the response to the next middleware
- The Response middleware receives the response as input and return the response data.

### Writing middleware

Middleware function arguments


|Parameter|Type|Description
|---------|-------|--------
|input    | `mixed`|The input value would depend on the preceding middleware. It can be a request options a response or anything else. The first middleware always receives the request options.
|next     |`function`|The callback used to deliver the middleware result to the next middleware.
|resolve  | `function`|The resolver callback. This callback can be used to skip the rest of the middlewares and resolve the request with response data.

Aside the arguments listed above, other arguments can be passed to  the following middleware by calling **next()** with additional argumemts. The additional arguments would be appended the argument list of the next middleware function.


~~~js

function(input, next, resolve, ...extraArgs) {
  const result = process(input); //.... do something with input
  if(/*some condition*/){
     next(result, ...extraArgs)// pass result to next middleware
  } else {
    resolve(result);// exit middleware chain with result
  }
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


#### Example: Adding Cache middleware

~~~js
const userService = new RestService('http://example.com/api/v1');
const userModel = userService.registerModel('User', '/users');

let cache = {};// very minimal cache. Ideally a more sophistictated cache should be used.

const requestHandler = function requestHandler(input, next, resolve) {
  if (cache[input.url]) { // use caches
    resolve(cache[input.url]);
  } else { // continure with the request
    next(makeRequest(input), input);// passes the original input. the next middleware would receive it as extra argument
  }
};

const responseHandler = function responseHandler(input, next, resolve, originalInput) {
  if(originalIpunt.method === 'GET') {
     cache[originalInput.url] = input;// save only get request
  } else if(originalIpunt.method !== 'GET' && cache[originalInput.url]) { // PUT, DELETE, POST
    delete cache[originalInput.url]; delete GET path if model was updated
  }
  next(input);
};

userService.useMiddlewares([requestHandler, responseHandler]);

// get all users - this call goes to the server
let users = await userModel.query({view: 'thin'}); // HTTP GET http://example.com/api/v1/users?view=thin

// get all users - the next call does not. Data is fetched from cache
users = await userModel.query({view: 'thin'}); // HTTP GET http://example.com/api/v1/users?view=thin

// get all users - this call goes to the server since a different param was passed
users = await userModel.query({view: 'full'}); // HTTP GET http://example.com/api/v1/users?view=thin

~~~