/*jshint node:true*/
( function( module ) {
   'use strict';

   var dox = require( 'dox' );

   module.exports.createMarkdown = createMarkdown;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createMarkdown( jsCode ) {
      var jsonDoc = dox.parseComments( jsCode, {
         raw: true
      } );

      return '# Documentation\n\n' + jsonDoc
         .map( parseComment )
         .filter( function( _ ) { return _.length > 0;} )
         .join( '\n\n' );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function parseComment( comment ) {
      var context = comment.ctx;
      if( !context ) {
         // for now we skip comments without actual context
         return '';
      }

      var meta = {
         isPrivate: false
      };
      var tags = processTags( comment.tags, meta );
      if( meta.isPrivate ) {
         return '';
      }

      var doc = '';

      doc += renderItemName( context, tags );
      doc += comment.description.full;
      doc += renderParameters( tags );
      doc += renderReturn( tags );

      return doc;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function renderItemName( context, tags ) {
      var doc = '';
      var name = context.name;
      switch( context.type ) {
         case 'method': // fall through
         case 'function':
            if( context.type === 'method' ) {
               name = context.constructor + '#' + name;
            }
            var tagDoc = tags
               .filter( function( tag ) {
                  return tag.type === 'param' && tag.isProperty === false;
               } )
               .map( function( tag ) {
                  if( tag.isOptional ) {
                     return '[' + tag.name + ']';
                  }
                  return tag.name;
               } )
               .join( ', ' );

            doc += substitute( '## [name]([args])\n', {
               name: name,
               args: tagDoc.length > 0 ? ' ' + tagDoc + ' ' : ''
            } );
            break;

         case 'property':
            if( context.constructor ) {
               name = context.constructor + '#' + name;
            }
            var typeTag = tags.filter( function( _ ) { return _.type === 'type'; } )[0];
            var type = typeTag ? typeTag.types.join( '|' ) : '?';
            doc += substitute( '## [name] {[type]}\n', {
               name: name,
               type: type
            } );
            break;

         default:
            // noop

      }

      return doc;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function renderReturn( tags ) {
      var doc = '';
      var params = tags.filter( function( _ ) { return _.type === 'return' || _.type === 'returns'; } );
      if( params.length ) {
         doc += '\n### Returns\n';
         doc += params
            .map( function( param ) {
               return substitute( '- **{[type]}**: [description]', {
                  type: param.types.join( '|' ),
                  description: param.string
               } );
            } )
            .join( '\n\n' ) + '\n';
      }
      return doc;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function renderParameters( tags ) {
      var doc = '';
      var params = tags.filter( function( _ ) { return _.type === 'param'; } );
      if( params.length ) {
         doc += '\n### Parameters\n';
         doc += params
            .map( function( param ) {
               var nameParts = param.name.split( '.' );
               var paramName = nameParts[ nameParts.length - 1 ];
               return substitute( '[level]- **[name] {[type]}**: [description]', {
                  name: param.isOptional ? '_' + paramName + '_' : paramName,
                  type: param.types.join( '|' ),
                  description: param.string,
                  level: new Array( nameParts.length ).join( '  ' )
               } );
            } )
            .join( '\n\n' ) + '\n';
      }
      return doc;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function processTags( tagData, meta ) {
      var currentTag = null;
      var tags = [];
      tagData.forEach( function( tag ) {
         if( tag.string == null ) { tag.string = ''; }
         if( tag.type ) {
            currentTag = tag;
            tags.push( tag );

            switch( tag.type ) {
               case 'param':
                  processTagParam( tag );
                  break;

               case 'private':
                  meta.isPrivate = true;
                  break;

               case 'constructor':
                  meta.isConstructor = true;
                  break;

               default:
                  // noop;
            }

            return;
         }

         if( !currentTag ) {
            throw new Error( 'Got tag without type and had no tag before: ' + tag );
         }

         // dox doesn't like line breaks in the description of e.g. @param tags. These cases can detected
         // whenever there is a tag without a type information.
         currentTag.string += ( currentTag.string.length === 0 ? '' : '\n' ) + tag.string;
      } );

      return tags;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var OPTIONAL_MATCHER = /^\[([^\]]+)\]$/;
   function processTagParam( param ) {
      param.isOptional = false;
      var match = OPTIONAL_MATCHER.exec( param.name );
      if( match ) {
         param.name = match[1];
         param.isOptional = true;
      }

      param.isProperty = param.name.indexOf( '.' ) !== -1;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function substitute( str, substitutions ) {
      return Object.keys( substitutions ).reduce( function( str, key ) {
         return str.split( '[' + key + ']' ).join( substitutions[ key ] );
      }, str );
   }

} )( module );