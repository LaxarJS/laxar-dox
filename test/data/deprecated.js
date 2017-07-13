/**
 * Tests for the deprecation tag
 *
 * @module deprecated
 */


/**
 * This function does new stuff
 *
 * @param {Number} x
 *    just a parameter
 */
export function a( x ) {

}

/**
 * This function does old stuff
 *
 * @deprecated
 *    There is a better way to do this, namely {@link #a()}
 *
 * @param {Number} x
 *    just a parameter
 */
export function b( x ) {

}

/**
 * Just a number
 *
 * @name X
 * @type {Number}
 */
export const X = 12;

/**
 * Just an old number
 *
 * @deprecated
 *    Please use {@link #X} instead
 *
 * @name Y
 * @type {Number}
 */
export const Y = 13;


/**
 * Very important type
 *
 * @deprecated
 *    Don't use. There is no alternative
 *
 * @constructor
 */
function MyType() {

}

/**
 * Still valid type
 *
 * @constructor
 */
function MyValidType() {

}

/**
 * Let's the rectangle grow by one pixel into each direction. The new coordinates are returned.
 *
 * @deprecated
 *    Don't use. There is no alternative. Really!
 *
 * @return {String}
 *    an empty string
 */
MyValidType.prototype.dontUse = function() {
   return '';
};
