/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */

export const GLOBAL_ITEM_NAME = 'ax__global__';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function tagsByType( tags, ...types ) {
   return ( tags || [] ).filter( tag => types.indexOf( tag.type ) !== -1 );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function description( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   const desc = doxComment.description;
   if( typeof desc === 'string' ) {
      return desc;
   }
   if( typeof desc === 'object' && desc.hasOwnProperty( 'full' ) ) {
      return desc.full;
   }
   return '';
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function isGlobal( item ) {
   // TODO: also extract dox property for name?
   return item.name === GLOBAL_ITEM_NAME;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function isModule( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   return ( doxComment.tags || [] ).some( tag => tag.type === 'module' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function isInjection( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   return ( doxComment.tags || [] ).some( tag => tag.type === 'injection' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function isDirective( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   return ( doxComment.tags || [] ).some( tag => tag.type === 'directive' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function isFunction( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   if( doxComment.ctx.type === 'method' || doxComment.ctx.type === 'function' ) {
      return true;
   }

   if( doxComment.tags ) {
      const hasFunctionType = doxComment.tags.some( tag =>
         tag.type === 'type' &&
            ( tag.types.indexOf( 'Function' ) !== -1 || tag.types.indexOf( 'function' ) !== -1 )
      );
      if( hasFunctionType ) {
         return true;
      }

      const hasParamOrReturn = doxComment.tags.some( tag => tag.type === 'param' || tag.type === 'return' );
      if( hasParamOrReturn ) {
         return true;
      }
   }
   return false;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function isPrivate( doxComment ) {
   return doxComment.isPrivate || doxComment.ignore;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function not( test ) {
   return ( ...args ) => !test( ...args );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function and( ...tests ) {
   return ( ...args ) => tests.every( test => test( ...args ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function findItemByName( items, name ) {
   return items.filter( item => item.name === name )[ 0 ] || null;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function extend( target, source ) {
   Object.keys( source ).forEach( key => {
      target[ key ] = source[ key ];
   } );
   return target;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function getPath( obj, thePath, optionalDefault = undefined ) {
   const pathArr = thePath.split( '.' );
   let node = obj;
   let key = pathArr.shift();

   while( key ) {
      if( node && typeof node === 'object' && node.hasOwnProperty( key ) ) {
         node = node[ key ];
         key = pathArr.shift();
      }
      else {
         return optionalDefault;
      }
   }

   return node;
}
