## v0.1.7 (2018-05-16)

Custom action bug fixes
- Context not passed to middlewares when using custom actions
- Incorrect parameters send in request middleware

## v0.1.1 - v0.1.4 (2018-03-13)

Documentation update

## v0.1.0 (2018-03-13)

In this version a Context object is added as parameter to each middleware function, after the **resolve** parameter. A request context can be defined in the last argument of **query**, **get**, **create**, **update** and **delete** method of Models. In a middleware function the passed context would be under the request attribute of the passed context argument.
This change might break existing code with custom middleware were extra arguments are passed between middlewares. However, the fix is simple. You only have to add the context argument before the **resolve** argument and after the extra args.

## v0.0.16 (2018-03-12)

Documentation update

    -  ModelConfig.setIdField()

## v0.0.15 (2018-03-11)

Bug Fix

   - Cannot set custom ID field in model configuration

## v0.0.14 (2018-03-05)

Bug Fix

   - Proper client side support

## v0.0.13 (2018-03-05)

Doc update

## v0.0.12 (2018-03-05)

Changelog update

## v0.0.11 (2018-03-05)

Chang Log update

## v0.0.10 (2018-03-05)

Code cleanup

## v0.0.8 (2018-03-05)

- Middlewares: Originally all middlewares defined are called during a request. In this release, any middleware can exit the chain an resolve a request with a response. The following middlewares would not be called. A good use case is for caching of requests.


## v0.0.7 (2018-03-02)

- Client side build


## v0.0.6 (2018-03-02)

- Documentation update


## v0.0.5 (2018-03-02)

- Added support for advanced relation config


## v0.0.4 (2018-02-28)

- Bug Fixes


## v0.0.3 (2018-02-28)

- Documentation update


## v0.0.2 (2018-02-28)

- Bug Fixes


## v0.0.1 (2018-02-28)

- Initial


