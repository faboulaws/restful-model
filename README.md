## Restful Model


A module that abstracts the process of consuming a REST endpoint from both client and server side.

## Usage

### Create a new endpoint service

~~~js

const userService = new RestService('http://example.com/api/v1');
const userModel = userService.registerModel('User', '/users');

// get all users
userModel.query({}); // HTTP GET http://example.com/api/v1/users

// get user by ID
userModel.get({id: 1}); // HTTP GET http://example.com/api/v1/users/1

// create user
userModel.create({id: 1}, {full_name: "John Doe"}); // HTTP POST http://example.com/api/v1/users

// update user
userModel.update({id: 1}, {full_name: "John Doe"}); // HTTP PUT http://example.com/api/v1/users/1


// delete user
userModel.delete({id: 1}); // HTTP DELETE http://example.com/api/v1/users/1

~~~


### Custom endpoints

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
const friends = useService.getFiends({id: 1});

~~~

### Model relationships

~~~js
const articleService = new RestService('http://articles.example.com/api/v1');
const authorService = new RestService('http://authors.example.com/api/v1');
const commentService = new RestService('http:/comments.example.com/api/v1');

const modelConfig = RestService.modelConfig()
                         .hasMany('Comments', 'comments', 'articleId')
                         .hasOne('Author', 'author');
const userModel = userService.registerModel('User', '/users', modelConfig);
~~~~

## Get a single item
~~~js
// would get a article model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = articleService.get({id: i}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles/1
// HTTP GET http://example.com/api/v1/authors?id[]=<article.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<user.id>
~~~

## Get a multiple items

~~~js
// would get a articles an eah item would have  model with 2 extra fields author (the fetched author) and comments (array of fetched comments)
const article = articleService.query({id: i}, ['author','comments']);
// HTTP GET http://example.com/api/v1/articles
// HTTP GET http://example.com/api/v1/authors?id[]=<article1.authorId>&id[]=<article2.authorId>
// HTTP GET http://example.com/api/v1/comments?articleId[]=<article1.id>&articleId[]=<article2.id>

~~~

# Limitations

There is a limited length to requests queries large result set would fail.


