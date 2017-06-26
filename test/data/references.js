/**
 * Tests for different references between types and modules
 *
 * @module references
 */
import { Pair } from './types';

/**
 * A better {@link types#Pair}, adding some convenience.
 *
 * @param {Number} a
 *    first number of the pair
 * @param {Number} b
 *    second number of the pair
 *
 * @constructor
 * @extends Pair
 */
function BetterPair( a, b ) {
   Pair.call( this, a, b );
}

BetterPair.prototype = Object.create( Pair.prototype, {} );

/**
 * Subtracts the given {@link types#Pair} from this instance.
 *
 * @param {Pair} p
 *    the pair to subtract
 *
 * @return {BetterPair}
 *    this instance
 */
BetterPair.prototype.subtract = function( p ) {
   this.add( new Pair( -p.a, -p.b ) );
   return this;
};

/**
 * Converts into a simple {@link types#Pair}. There's really no good reason to do this, except for testing
 * type references in `@return` tags. (Who needs {@linkplain #Pair.subtraction() subtraction} at all?)
 *
 * @return {Pair}
 *    the simple {@link types#Pair pair}
 */
BetterPair.prototype.toPair = function() {
   return new Pair( this.a, this.b );
};
