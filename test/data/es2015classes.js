/**
 * Tests for support of classes in ES2016 syntax.
 *
 * @module references
 */

/**
 * This is what we did in ye olde days.
 *
 * @constructor
 */
function OldSchoolClass() {

}

/**
 * This so 00.
 */
OldSchoolClass.prototype.oldMethod = function() {

};

/**
 * A base class
 */
export class Base {

   /**
    * The constructor of the base class.
    *
    * @param {String} arg
    *    just an argument
    */
   constructor( arg ) {

   }

   /**
    * It does nothing and just sits here
    */
   aMethod() {

   }

}


/**
 * A class extending {@link #Base}
 *
 * @extends Base
 */
export class SuperBase extends Base {

   /**
    * The constructor of the super base class.
    *
    * @param {String} arg
    *    just an argument
    */
   constructor( arg ) {
      super( arg );
   }

   /**
    * It does nothing and just sits here
    */
   bMethod() {

   }

}
