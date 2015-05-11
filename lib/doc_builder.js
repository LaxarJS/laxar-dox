/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* jshint node:true */
/* global __dirname */
(function( module ) {
   'use strict';

   var dox = require( 'dox' );
   var path = require( 'path' );
   var swig = require( 'swig' );

   var GLOBAL_ITEM_NAME = 'ax__global__';

   module.exports.createMarkdown = createMarkdown;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createMarkdown( jsCode ) {
      var doxResults = dox
         .parseComments( jsCode, {
            raw: true
         } )
         .filter( function( jsDoc ) {
            // Filter out the copyright header
            return !( description( jsDoc ).indexOf( 'Copyright' ) === 0 && jsDoc.line === 1 );
         } )
         .filter( not( isPrivate ) )
         .map( function( jsDoc ) {
            delete jsDoc.code;
            return jsDoc;
         } );

      swig.setFilter( 'wrap', function( input, wrapper, condition ) {
         return condition || arguments.length === 2 ? wrapper + input + wrapper : input;
      } );
      swig.setDefaults( {
         autoescape: false,
         locals: {
            isFunction: function( item ) {
               if( item.dox.ctx.type === 'method' || item.dox.ctx.type === 'function' ) {
                  return true;
               }
               if( item.dox.tags ) {
                  var hasFunctionType = item.dox.tags.some( function( tag ) {
                     return tag.type === 'type' &&
                        ( tag.types.indexOf( 'Function' ) !== -1 || tag.types.indexOf( 'function' ) !== -1 );
                  } );
                  if( hasFunctionType ) {
                     return hasFunctionType;
                  }
               }
               return false;
            }
         }
      } );

      var docTemplate = swig.compileFile( path.join( __dirname, '../templates/doc_template.md.tmpl' ) );
      var tocTemplate = swig.compileFile( path.join( __dirname, '../templates/toc_template.md.tmpl' ) );
      var typeTemplate = swig.compileFile( path.join( __dirname, '../templates/type_template.md.tmpl' ) );
      var functionTemplate = swig.compileFile( path.join( __dirname, '../templates/function_template.md.tmpl' ) );

      var commentHierarchy = buildCommentHierarchy( doxResults );

      // extract module description
      var module = ( ( commentHierarchy.filter( isGlobal )[0] || {} ).children || [] ).filter( isModule )[0];


      // render Module members
      var moduleMembers = commentHierarchy
         .filter( isGlobal );
      var moduleMembersContent = moduleMembers
         .map( function( type ) {
            return ( type.children || [] )
               .filter( not( isModule ) )
               .map( function( member ) {
                  return extend( member, { fullName: member.name } );
               } )
               .map( functionTemplate ).join( '' );
         } )
         .join( '' );
      var moduleMembersToc = [].concat.apply( [], moduleMembers
         .map( function( type ) {
            return ( type.children || [] )
               .filter( not( isModule ) )
               .map( function( member ) {
                  return {
                     name: member.name,
                     children: []
                  };
               } );
         } ) );

      // extract types / classes
      var types = commentHierarchy
         .filter( and( not( isGlobal ), not( isInjection ), not( isDirective ) ) );

      // extract injectable services
      var injectables = commentHierarchy
         .filter( and( not( isGlobal ), isInjection ) );

      // extract directives
      var directives = commentHierarchy
         .filter( and( not( isGlobal ), isDirective ) );

      return reduceEmptyLines( docTemplate( {
         module: module,
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

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function renderTypesWithChildren( types, typeTemplate, functionTemplate ) {
      return types.map( function( type ) {
            var members = ( type.children || [] )
               .map( function( member ) {
                  return extend( member, { fullName: type.name + '#' + member.name } );
               } )
               .map( functionTemplate ).join( '' );
            return extend( type, { members: members } );
         } )
         .map( typeTemplate ).join( '' );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function renderTypesWithChildrenToc( types, tocTemplate ) {
      var tocString = types.map( function( type ) {
            return {
               name: type.name,
               children: ( type.children || [] )
                  .map( function( member ) {
                     return { name: type.name + '#' + member.name };
                  } )
            };
         } );

      return tocTemplate( { entries: tocString } ).trim();
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function buildCommentHierarchy( doxComments ) {
      return doxComments.reduce( function( rootItems, doxComment ) {
         var item = parse( doxComment );
         if( item.dox.isConstructor ||
            isInjection( doxComment ) ||
            isDirective( doxComment ) ||
            doxComment.ctx.type === 'declaration' )
         {
            // A class constructor, an AngularJS directive or an injectable service is always a root item
            var existingItem = findItemByName( rootItems, item.name );
            if( !existingItem ) {
               item.children = [];
               return rootItems.concat( item );
            }
            extend( existingItem, item );
            return rootItems;
         }

         var memberOf = ( tagsByType( doxComment.tags, 'memberOf' )[0] || {} ).string;
         var belongsTo = memberOf ||
            ( typeof doxComment.ctx.constructor === 'string' ? doxComment.ctx.constructor : null );
         if( belongsTo ) {
            var parentItem = findItemByName( rootItems, belongsTo );
            if( !parentItem ) {
               // Seems our parent doesn't exist yet. So we create a temporary shell.
               return rootItems.concat( {
                  name: belongsTo,
                  children: [ item ]
               } );
            }

            parentItem.children.push( item );
            return rootItems;
         }

         var globalItem = findItemByName( rootItems, GLOBAL_ITEM_NAME );
         if( !globalItem ) {
            // Seems a global item doesn't exist yet. So we create a new one
            return rootItems.concat( {
               name: GLOBAL_ITEM_NAME,
               children: [ item ]
            } );
         }
         globalItem.children.push( item );
         return rootItems;
      }, [] );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function parse( doxComment ) {
      var parsed = {
         // An explicitly given name is used in favor of a derived one.
         name: ( tagsByType( doxComment.tags, 'name', 'directive', 'injection', 'module' )[0] || {} ).string ||
            doxComment.ctx.name ||
            '- unknown -',
         description: description( doxComment ),
         dox: doxComment
      };

      var optional = [];
      parsed.params = tagsByType( doxComment.tags, 'param' )
         .map( function( tag ) {
            var cleanName = tag.name.replace( /^\[?([^\]]*)\]?$/g, '$1' );
            var parents = cleanName.split( '.' ).slice( 0, -1 );
            if( tag.optional ) {
               optional.push( cleanName );
            }
            else if( parents.some( function( p ) { return optional.indexOf( p ) !== -1; } ) ) {
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
         .filter( function( param ) {
            // filter out object parameter properties for argument list
            return param.name.indexOf( '.' ) === -1;
         } )
         .map( function( param ) {
            return param.name;
         } );

      parsed.returns = tagsByType( doxComment.tags, 'return', 'returns' )
         .map( function( tag ) {
            return {
               name: tag.name,
               types: tag.types.length === 0 ? [ '*' ] : tag.types,
               description: description( tag, true ),
               dox: tag
            };
         } )[ 0 ] || null;

      return parsed;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function description( doxComment, removeLineBreaks ) {
      var res = '';
      var desc = doxComment.description;
      if( typeof desc === 'string' ) {
         res = desc;
      }
      else if( typeof desc === 'object' && desc.hasOwnProperty( 'full' ) ) {
         res = desc.full;
      }

      res = res.replace( /\{@link[ ]*([^\}]+)\}/g, '[$1](#$1)' );

      return removeLineBreaks ? res.trim().replace( /\s+/g, ' ' ) : res.trim().replace( /[ ]+/g, ' ' );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function tagsByType( tags, type/*, type, ... */ ) {
      var types = [].slice.call( arguments, 1 );
      return ( tags || [] ).filter( function( tag ) {
         return types.indexOf( tag.type ) !== -1;
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isGlobal( item ) {
      return item.name === GLOBAL_ITEM_NAME;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isModule( obj ) {
      var doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
      return ( doxComment.tags || [] ).some( function( tag ) { return tag.type === 'module'; } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isInjection( obj ) {
      var doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
      return ( doxComment.tags || [] ).some( function( tag ) { return tag.type === 'injection'; } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isDirective( obj ) {
      var doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
      return ( doxComment.tags || [] ).some( function( tag ) { return tag.type === 'directive'; } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isPrivate( doxComment ) {
      return doxComment.isPrivate || doxComment.ignore;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function not( test ) {
      return function() {
         return !test.apply( null, arguments );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function and( test1, test2 ) {
      var tests = [].slice.call( arguments, 0 );
      return function() {
         var args = [].slice.call( arguments, 0 );
         return tests.every( function( test ) {
            return test.apply( null, args );
         } );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function findItemByName( items, name ) {
      return items.filter( function( item ) {
         return item.name === name;
      } )[0] || null;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function extend( target, source ) {
      Object.keys( source ).forEach( function( key ) {
         target[ key ] = source[ key ];
      } );
      return target;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function reduceEmptyLines( string ) {
      return string.replace( /(\n{2,})/g, '\n\n' ).replace( /(\n{2,})$/, '\n' );
   }

})( module );
