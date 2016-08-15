/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import 'source-map-support/register';
import dox from 'dox';
import path from 'path';
import swig from 'swig';

const GLOBAL_ITEM_NAME = 'ax__global__';

export function createMarkdown( jsCode, options = {} ) {
   const doxResults = dox
      .parseComments( jsCode, {
         raw: true,
         skipSingleStart: true
      } )
      // filter out the copyright header
      .filter( jsDoc => !( description( jsDoc ).indexOf( 'Copyright' ) === 0 && jsDoc.line === 1 ) )
      .filter( not( isPrivate ) )
      .map( jsDoc => ({ ...jsDoc, code: undefined }) );

   swig.setFilter( 'wrap', ( input, wrapper, condition ) =>
      condition === undefined || condition ? wrapper + input + wrapper : input
   );
   swig.setFilter( 'if', ( input, condition ) => condition ? input : '' );
   swig.setDefaults( {
      autoescape: false,
      locals: {
         isFunction,
         firstType: dox => {
            const types = ( dox.tags.filter( _ => _.type === 'type' )[ 0 ] || {} ).types || [];
            return types[ 0 ];
         }
      }
   } );

   const templateDir = templateName => path.join( __dirname, `../templates/${templateName}.md.tmpl` );
   const docTemplate = swig.compileFile( templateDir( 'doc_template' ) );
   const tocTemplate = swig.compileFile( templateDir( 'toc_template' ) );
   const typeTemplate = swig.compileFile( templateDir( 'type_template' ) );
   const functionTemplate = swig.compileFile( templateDir( 'function_template' ) );
   const propertyTemplate = swig.compileFile( templateDir( 'property_template' ) );

   const commentHierarchy = buildCommentHierarchy( doxResults, options );

   // extract module description
   const module = ( ( commentHierarchy.filter( isGlobal )[ 0 ] || {} ).children || [] )
      .filter( isModule )[ 0 ];


   // render Module members
   const moduleMembers = commentHierarchy
      .filter( isGlobal );
   const moduleMembersContent = moduleMembers
      .map( type =>
         ( type.children || [] )
            .filter( not( isModule ) )
            .map( member => ({ ...member, fullName: member.name }) )
            .map( _ => isFunction( _ ) ? functionTemplate( _ ) : propertyTemplate( _ ) ).join( '\n\n' )
      )
      .join( '' );
   const moduleMembersToc = [].concat( ...moduleMembers
      .map( type =>
         ( type.children || [] )
            .filter( not( isModule ) )
            .map( member => ({ name: member.name, children: [] }) )
      ) );

   // extract types / classes
   const types = commentHierarchy
      .filter( and( not( isGlobal ), not( isInjection ), not( isDirective ) ) );

   // extract injectable services
   const injectables = commentHierarchy
      .filter( and( not( isGlobal ), isInjection ) );

   // extract directives
   const directives = commentHierarchy
      .filter( and( not( isGlobal ), isDirective ) );

   return reduceEmptyLines( docTemplate( {
      module,
      moduleMembersToc: tocTemplate( { entries: moduleMembersToc } ).trim(),
      injectablesToc: renderTypesWithChildrenToc( injectables, tocTemplate ),
      directivesToc: renderTypesWithChildrenToc( directives, tocTemplate ),
      typesToc: renderTypesWithChildrenToc( types, tocTemplate ),
      moduleMembers: moduleMembersContent,
      injectables: renderTypesWithChildren( injectables, typeTemplate, functionTemplate ),
      directives: renderTypesWithChildren( directives, typeTemplate, functionTemplate ),
      types: renderTypesWithChildren( types, typeTemplate, functionTemplate )
   } ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function renderTypesWithChildren( types, typeTemplate, functionTemplate ) {
   return types.map( type => {
      const members = ( type.children || [] )
         .map( member => ({ ...member, fullName: `${type.name}#${member.name}` }) )
         .map( functionTemplate ).join( '' );
      return { ...type, members };
   } )
   .map( typeTemplate ).join( '' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function renderTypesWithChildrenToc( types, tocTemplate ) {
   const tocString = types.map( type =>
      ({
         name: type.name,
         children: ( type.children || [] )
            .map( member => ({ name: `${type.name}#${member.name}` }) )
      })
   );

   return tocTemplate( { entries: tocString } ).trim();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function buildCommentHierarchy( doxComments, options ) {
   return doxComments.reduce( ( rootItems, doxComment ) => {
      const item = parse( doxComment, options );
      if( item.dox.isConstructor ||
          isInjection( doxComment ) ||
          isDirective( doxComment ) ||
          doxComment.ctx.type === 'declaration' ) {
         // A class constructor, an AngularJS directive or an injectable service is always a root item
         const existingItem = findItemByName( rootItems, item.name );
         if( !existingItem ) {
            item.children = [];
            return rootItems.concat( item );
         }
         extend( existingItem, item );
         return rootItems;
      }

      const memberOf = ( tagsByType( doxComment.tags, 'memberOf' )[ 0 ] || {} ).string;
      const belongsTo = memberOf ||
         ( typeof doxComment.ctx.constructor === 'string' ? doxComment.ctx.constructor : null );
      if( belongsTo ) {
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
         const cleanName = tag.name.replace( /^\[?([^\]]*)\]?$/g, '$1' );
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
            description: description( tag, true ),
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
            description: description( tag, true ),
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
 *
 * @param {Object} doxComment
 *    comment to extract the description from
 * @param {Boolean} convertLineBreaks
 *    if `true`, line breaks in front of a list item are converted to `<br>`
 * @return {String}
 *    description extracted from the comment
 */
function description( doxComment, convertLineBreaks ) {
   let res = '';
   const desc = doxComment.description;
   if( typeof desc === 'string' ) {
      res = desc;
   }
   else if( typeof desc === 'object' && desc.hasOwnProperty( 'full' ) ) {
      res = desc.full;
   }

   res = res.replace( /\{@link[ ]*([^\}]+)\}/g, '[$1](#$1)' ).trim();

   if( !convertLineBreaks ) {
      return res;
   }

   let previousEmpty = false; // Not FP, but I guess it's okay here ...
   return res.split( /\n/g )
      .map( _ => _.trim() )
      .map( line => {
         const forcedLineBreak = previousEmpty;
         previousEmpty = line.length === 0;
         return ( ( forcedLineBreak || line.match( /^[*\-]/ ) ) ? '<br>' : ' ' ) + line;
      } )
      .join( '' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function tagsByType( tags, ...types ) {
   return ( tags || [] ).filter( tag => types.indexOf( tag.type ) !== -1 );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isGlobal( item ) {
   return item.name === GLOBAL_ITEM_NAME;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isModule( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   return ( doxComment.tags || [] ).some( tag => tag.type === 'module' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isInjection( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   return ( doxComment.tags || [] ).some( tag => tag.type === 'injection' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isDirective( obj ) {
   const doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
   return ( doxComment.tags || [] ).some( tag => tag.type === 'directive' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isFunction( obj ) {
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
         return hasFunctionType;
      }
   }
   return false;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isPrivate( doxComment ) {
   return doxComment.isPrivate || doxComment.ignore;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function not( test ) {
   return ( ...args ) => !test( ...args );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function and( ...tests ) {
   return ( ...args ) => tests.every( test => test( ...args ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function findItemByName( items, name ) {
   return items.filter( item => item.name === name )[ 0 ] || null;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function extend( target, source ) {
   Object.keys( source ).forEach( key => {
      target[ key ] = source[ key ];
   } );
   return target;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function reduceEmptyLines( string ) {
   return string.replace( /(\n{2,})/g, '\n\n' ).replace( /(\n{2,})$/, '\n' );
}
