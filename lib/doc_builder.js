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

      // render Module members
      var moduleMembers = commentHierarchy.filter( isGlobal );
      var moduleMembersContent = moduleMembers
         .map( function( type ) {
            return ( type.children || [] )
               .map( function( member ) {
                  return extend( member, { fullName: member.name } );
               } )
               .reduce( function( acc, member ) {
                  return acc + functionTemplate( member );
               }, '' );
         } )
         .join( '' );
      var moduleMembersToc = [].concat.apply( [], moduleMembers
         .map( function( type ) {
            return ( type.children || [] )
               .map( function( member ) {
                  return {
                     name: member.name,
                     children: []
                  };
               } );
         } ) );

      // render types / classes
      var types = commentHierarchy.filter( not( isGlobal ) ).filter( not( isInjection ) );
      var typesContent = types
         .map( function( type ) {
            var members = ( type.children || [] )
               .map( function( member ) {
                  return extend( member, { fullName: type.name + '#' + member.name } );
               } )
               .reduce( function( acc, member ) {
                  return acc + functionTemplate( member );
               }, '' );
            return extend( type, { members: members } );
         } )
         .reduce( function( acc, type ) {
            return acc + typeTemplate( type );
         }, '' );
      var typesToc = types
         .map( function( type ) {
            return {
               name: type.name,
               children: ( type.children || [] )
                  .map( function( member ) {
                     return { name: type.name + '#' + member.name };
                  } )
            };
         } );

      // render injectable services
      var injectables = commentHierarchy.filter( not( isGlobal ) ).filter( isInjection );
      var injectablesContent = injectables
         .map( function( type ) {
            var members = ( type.children || [] )
               .map( function( member ) {
                  return extend( member, { fullName: type.name + '#' + member.name } );
               } )
               .reduce( function( acc, member ) {
                  return acc + functionTemplate( member );
               }, '' );
            return extend( type, { members: members } );
         } )
         .reduce( function( acc, type ) {
            return acc + typeTemplate( type );
         }, '' );
      var injectablesToc = injectables
         .map( function( type ) {
            return {
               name: type.name,
               children: ( type.children || [] )
                  .map( function( member ) {
                     return { name: type.name + '#' + member.name };
                  } )
            };
         } );

      return reduceEmptyLines( docTemplate( {
         moduleMembersToc: tocTemplate( { entries: moduleMembersToc } ).trim(),
         injectablesToc: tocTemplate( { entries: injectablesToc } ).trim(),
         typesToc: tocTemplate( { entries: typesToc } ).trim(),
         moduleMembers: moduleMembersContent,
         injectables: injectablesContent,
         types: typesContent
      } ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function buildCommentHierarchy( doxComments ) {
      return doxComments.reduce( function( rootItems, doxComment ) {
         var item = parse( doxComment );
         if( item.dox.isConstructor || isInjection( doxComment ) || doxComment.ctx.type === 'declaration' ) {
            // A class constructor or a injectable service always is a root item
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
         name: ( tagsByType( doxComment.tags, 'name', 'injection' )[0] || {} ).string ||
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

   function isInjection( obj ) {
      var doxComment = obj.hasOwnProperty( 'dox' ) ? obj.dox : obj;
      return ( doxComment.tags || [] ).some( function( tag ) { return tag.type === 'injection'; } );
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
