# Laxar Dox

*Laxar Dox* is an API documentation generator specifically adjusted to the structure of *LaxarJS* code.

## About

API that needs to be documented can directly be part of a module exporting some functionality, some type or object defined within a module or an *AngularJS* service (and its friends).
It's even very likely that those three types of API can all be found together within one module.
Basically documentation uses [JSDoc](http://usejsdoc.org/) tags and notation, limited to a smaller subset of tags described in the following.

Since *Laxar Dox* is intended to be primarily used by contributors to *LaxarJS* sources, this readme mentions some conventions that are not a requirement to make the tool work, but should instead guarantee consistent sources and documentation.

## Documenting Functions

Generally function documentation consists of three parts:
A description, a list of parameters and a return value.
The description can be any multiline text using [github flavored markdown](https://help.github.com/articles/github-flavored-markdown/) syntax (in the following *markdown* always refers to the github flavored markdown syntax).
Examples should simply be part of this description, using the syntax for [fenced code blocks](https://help.github.com/articles/github-flavored-markdown/#fenced-code-blocks).

Parameters must each be documented using an `@param` tag, followed by the type and the name of the respective parameter
Additionally there can be a description for the parameter, also using markdown.
For better readability of the source code, this description should start on a new line, indented by three spaces.
Multiple parameters should just be listed after each other.
If a parameter is optional, its name must be enclosed by square brackets (`[` and `]`).
Parameters of type object with properties are documented as described [here](http://usejsdoc.org/tags-param.html#parameters-with-properties).

The optional return value of a function must be documented using the `@return` tag, followed by a type and a description.
In contrast to the `@param` tag, a name is of course omitted.

It might also be necessary to mention the type the according function belongs to.
In case of functions attached to the `prototype` object of a constructor function, *Dox* will derive the type by itself.
Especially in the case of an *AngularJS* service *Dox* isn't capable to do so.
In such a case the type the function belongs to needs be explicitly specified using the `@memberOf` tag.

Functions that should not appear within the generated API doc can still be documented, but must be marked with an `@ignore` or `@private` tag.

Example:

```javascript
/**
 * This function takes *arguments* and *returns* something.
 * Isn't that cool?
 *
 * @param {String} firstArgument
 *    this is the first argument to the function
 * @param {Number} [secondArgument]
 *    this is the second argument to the function, which may be omitted
 * 
 * @return {Boolean}
 *    in some cases, it returns `true`, otherwise `false`
 *
 * @memberOf myHelperType
 */
function myFunction( firstArgument, secondArgument ) {
   return firstArgument.length === ( secondArgument || 0 );
}
```

## Documenting Types & Objects

Just as it is the case with functions, documentation for types and objects might start with a description.
It might additionally often be necessary to explicitly specify the name of the type using the `@name` tag.
This can be seen as the counterpart of the `@memberOf` tag for functions mentioned above.

If the type is defined by a constructor function, this function should be marked using the `@constructor` tag.
Just as it is the case for functions, it can have arguments, listed using the `@param` tag.

Constructor example:

```javascript
/**
 * Constructor for an event bus.
 *
 * @param {Object} [optionalConfiguration]
 *    configuration for the event bus instance
 * @param {Number} optionalConfiguration.pendingDidTimeout
 *    the timeout in milliseconds used by {@link EventBus#publishAndGatherReplies}. Default is 120000ms
 *
 * @constructor
 */
function EventBus( optionalConfiguration ) {
   // ...
}
```

Simple type example:

```javascript
/**
 * @name axVisibilityServiceHandler
 */
var api = {

   /**
    * Determine if the governing widget scope's DOM is visible right now.
    *
    * @return {Boolean}
    *    `true` if the widget associated with this handler is visible right now, else `false`.
    *
    * @memberOf axVisibilityServiceHandler
    */
   isVisible: function() {
      return isVisible( areaName );
   },
   
   // ...
};
```

## Documenting AngularJS Services

*AngularJS* services are not covered by already existing *JSDoc* tags and we decided against (mis-)using one of the other less common tags for our purpose.
Thus for *LaxarJS Dox* there is the custom tag `@injection`, which must be used to mark a service, that should be publicly available to others.
The name of the service may either be appended to this tag or specified separately by using the `@name` tag used with types.
Because of the better support by common JavaScript IDEs, the latter should be the way of choice in most cases.
At least *WebStorm* then detects `@name` and `@memberOf` tags belonging together and marks any typos or missing documentation.
Writing the name after the `@injection` tag is an option, if a service exposes no api at all or is itself made up of only one function and hence has no cause for subsequent `@memberOf` tags.

Simple Example:

```javascript
/**
 * A timestamp function, provided as a service to support the jasmine mock clock during testing.
 * The mock-free implementation simply uses `new Date().getTime()`.
 *
 * @injection axTimestamp
 */
module.factory( 'axTimestamp', function() {
   return function() {
      return new Date().getTime();
   };
} );
```

Example with more api:

```javascript
/**
 * A dummy service with a very very complex api
 *
 * @name axDummyService
 * @injection
 */
module.factory( 'axDummyService', function() {
   return {
      
      /**
       * Does nothing useful.
       *
       * @memberOf axDummyService
       */
      memberOne: function() { /* ... */ },
      
      /**
       * Does nothing useful too, but at least takes an argument
       *
       * @param {Boolean} doNothing
       *    if `true`, does nothing. Otherwise does nothing, too
       *
       * @memberOf axDummyService
       */
      memberTwo: function() { /* ... */ }
      
   };
} );
```

## Implementation Information

*LaxarJS Dox* uses [Dox](https://github.com/tj/dox) to parse API doc comments of JavaScript source code into a simple JavaScript Object Structure (i.e. a JSON representation).
It then applies some transformation and restructures the API doc comments that were found into a correct hierarchical form.
Lastly the derived structure is rendered as markdown, based on templates using the template engine [Swig](https://github.com/paularmstrong/swig/).
