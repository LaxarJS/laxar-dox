/**
 * Tests for types
 *
 * @module types
 */

/**
 * A class for a pair of numbers.
 *
 * @param {Number} a
 *    first number of the pair
 * @param {Number} b
 *    second number of the pair
 *
 * @constructor
 */
function Pair( a, b ) {
   this.a = a;
   this.b = b;
}

/**
 * Adds another pair.
 *
 * @param {Pair} p
 *    the pair to add
 */
Pair.prototype.add = function( p ) {
   this.a += p.a;
   this.b += p.b;
};

/**
 * A class for a rectangle. Uses {@link #Pair} instances to define its location and size.
 *
 * @param {Pair} coordinates
 *    the left and bottom coordinates of the rectangle
 * @param {Pair} size
 *    the width and height of the rectangle
 *
 * @constructor
 */
function Rectangle( coordinates, size ) {
   this.coordinates = coordinates;
   this.size = size;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Let's the rectangle grow by one pixel into each direction. The new coordinates are returned.
 *
 * @return {Pair}
 *    the new coordinates after growth
 */
Rectangle.prototype.grow = function() {
   this.size.add( new Pair( 2, 2 ) );
   this.coordinates.add( new Pair( -1, -1 ) );
   return this.coordinates;
};

/**
 * Converts this rectangle into a circle. As long as that isn't possible, we'll keep this private and hence
 * out of the generated docs.
 *
 * @private
 */
Rectangle.prototype.toCircle = function() {
   // How to do that???
};
