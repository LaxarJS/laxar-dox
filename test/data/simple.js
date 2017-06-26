/**
 * Simple test module
 *
 * @module simple
 */


const INTERNAL_TWELVE = 12;
// WARNING: Don't insert something between the module comment and the above constant. This is a regression
// test for https://github.com/LaxarJS/laxar-dox/issues/21

/**
 * The default for defaults.
 *
 * @name DEFAULT
 * @type {String}
 */
export const DEFAULT = 'default';

/**
 * This function is very simple.
 *
 * @param {String} a
 *    some string
 * @param {Number} b
 *    some number
 *
 * @return {Number}
 *    a mostly constant `12`
 */
export function func( a, b ) {
   return INTERNAL_TWELVE;
}
