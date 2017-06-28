/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import {
   GLOBAL_ITEM_NAME,
   description,
   extend,
   findItemByName,
   isInjection,
   isDirective,
   isModule,
   tagsByType
} from './utilities';


export function buildCommentHierarchy( doxComments, options ) {
   let moduleName = '';
   let moduleHidden = false;
   const symbols = [];
   const commentHierarchy = doxComments.reduce( ( rootItems, doxComment ) => {
      const item = parse( doxComment, options );
      if( isModule( item ) ) {
         moduleName = item.name;
         moduleHidden = !!tagsByType( doxComment.tags, 'ignore' )[ 0 ];
         // remove all automatically (and probably wrongly) derived context. Modules are always explicitly
         // marked as such and any other context that was found most probably belongs to an item without doc
         // comment directly following the module header (see https://github.com/LaxarJS/laxar-dox/issues/21).
         doxComment.ctx = false;
      }
      if( item.dox.isConstructor ||
          isInjection( doxComment ) ||
          isDirective( doxComment ) ||
          doxComment.ctx.type === 'declaration' ) {

         const extendsTag = tagsByType( doxComment.tags, 'extends' )[ 0 ] || null;
         item.extendsType = extendsTag && extendsTag.otherClass;
         // A class constructor, an AngularJS directive or an injectable service is always a root item
         const existingItem = findItemByName( rootItems, item.name );
         if( !existingItem ) {
            symbols.push( item.name );
            item.children = [];
            return rootItems.concat( item );
         }
         extend( existingItem, item );
         return rootItems;
      }

      const memberof = ( tagsByType( doxComment.tags, 'memberof' )[ 0 ] || {} ).string;
      const belongsTo = memberof ||
         ( typeof doxComment.ctx.constructor === 'string' ? doxComment.ctx.constructor : null ) ||
         ( typeof doxComment.ctx.receiver === 'string' ? doxComment.ctx.receiver : null );
      if( belongsTo ) {
         if( symbols.indexOf( belongsTo ) === -1 ) {
            symbols.push( belongsTo );
         }
         symbols.push( `${belongsTo}.${item.name}` );

         const parentItem = findItemByName( rootItems, belongsTo );
         if( !parentItem ) {
            // Seems our parent doesn't exist yet. So we create a temporary shell.
            return [ ...rootItems, {
               name: belongsTo,
               children: [ item ]
            } ];
         }

         parentItem.children.push( item );
         return rootItems;
      }

      const globalItem = findItemByName( rootItems, GLOBAL_ITEM_NAME );
      if( !isModule( item ) ) {
         symbols.push( `${item.name}` );
      }
      if( !globalItem ) {
         // Seems a global item doesn't exist yet. So we create a new one
         return [ ...rootItems, {
            name: GLOBAL_ITEM_NAME,
            children: [ item ]
         } ];
      }
      globalItem.children.push( item );
      return rootItems;
   }, [] );

   return { moduleName, moduleHidden, commentHierarchy, symbols };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function parse( doxComment, options ) {
   if( !( 'ctx' in doxComment ) ) {
      doxComment.ctx = false;
   }

   const parsed = {
      // An explicitly given name is used in favor of a derived one.
      name: ( tagsByType( doxComment.tags, 'name', 'directive', 'injection', 'module' )[ 0 ] || {} ).string ||
         doxComment.ctx.name ||
         '- unknown -',
      description: description( doxComment ),
      dox: doxComment
   };

   const optional = [];
   parsed.params = tagsByType( doxComment.tags, 'param' )
      .map( tag => {
         const cleanName = tag.name.replace( /^\[?([^\]]*)]?$/g, '$1' );
         const parents = cleanName.split( '.' ).slice( 0, -1 );
         if( tag.optional ) {
            optional.push( cleanName );
         }
         else if( parents.some( p => optional.indexOf( p ) !== -1 ) ) {
            // a property of an optional object parameter is optional too
            optional.push( cleanName );
            tag.optional = true;
         }

         return {
            name: cleanName,
            types: tag.types.length === 0 ? [ '*' ] : tag.types,
            description: convertLineBreaks( description( tag ) ),
            dox: tag
         };
      } );

   parsed.paramsForArgsList = parsed.params
      // filter out object parameter properties for argument list
      .filter( param => param.name.indexOf( '.' ) === -1 )
      .map( param => param.name );

   parsed.returns = tagsByType( doxComment.tags, 'return', 'returns' )
      .map( tag =>
         ({
            name: tag.name,
            types: tag.types.length === 0 ? [ '*' ] : tag.types,
            description: convertLineBreaks( description( tag ) ),
            dox: tag
         })
      )[ 0 ] || null;

   if( options.verbose ) {
      /* eslint-disable no-console */
      console.log( JSON.stringify( parsed, null, 3 ) );
      /* eslint-enable no-console */
   }

   return parsed;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Converts linebreaks in front of list items into `<br>` tags.
 * This is for exmaple useful when lists should be rendered in tables, where markdown doesn't correctly parse
 * them.
 *
 * @param {String} text
 *    text to convert line breaks in
 * @return {String}
 *    text with converted line breaks
 */
function convertLineBreaks( text ) {
   let previousEmpty = false; // Not FP, but I guess it's okay here ...
   return text.split( /\n/g )
      .map( _ => _.trim() )
      .map( line => {
         const forcedLineBreak = previousEmpty;
         previousEmpty = line.length === 0;
         return ( ( forcedLineBreak || line.match( /^[*-]/ ) ) ? '<br>' : ' ' ) + line;
      } )
      .join( '' );
}
