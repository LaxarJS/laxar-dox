/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import 'source-map-support/register';
import dox from 'dox';
import path from 'path';
import swig from 'swig';
import {
   and,
   description,
   isPrivate,
   isFunction,
   isGlobal,
   isModule,
   isInjection,
   isDirective,
   not
} from './utilities';
import { buildCommentHierarchy } from './file-parser';

const LINK_MATCHER =
   /\{@link(plain)? ([\w-]+)?(?:#([\w]+))?\.?([\w]+)?(\(\))?( [^}]+)?\}/gi;

export function createMarkdownForFiles( files, options ) {
   const warn = options.warn || ( ( filename, message ) => {
      // eslint-disable-next-line no-console
      console.warn( 'WARN (@ ' + filename + '): ' + message );
   } );
   const templates = createSwigTemplates();
   const symbolsToFilename = {};
   // eslint-disable-next-line no-console
   const duplicateModuleChecker = createDuplicateModuleChecker( options.warn || ( _ => console.warn( _ ) ) );

   const result = files
      .map( file => {
         const doxResults = dox
            .parseComments( file.sourceContent, {
               raw: true,
               skipSingleStart: true
            } )
            // filter out the copyright header
            .filter( jsDoc => !( description( jsDoc ).indexOf( 'Copyright' ) === 0 && jsDoc.line === 1 ) )
            .filter( not( isPrivate ) )
            .map( jsDoc => ({ ...jsDoc, code: undefined }) );

         const { moduleName, moduleHidden, commentHierarchy, symbols } =
            buildCommentHierarchy( doxResults, options );

         if( moduleName ) {
            symbolsToFilename[ moduleName ] = file.targetFilename;
            duplicateModuleChecker.register( moduleName, file.sourceFilename );
         }
         else if( !options.onlyPublicModules ) {
            warn( file.sourceFilename, 'no top-level module definition found (@module)' );
         }
         symbols.forEach( _ => {
            symbolsToFilename[ _ ] = file.targetFilename;
            if( moduleName ) {
               symbolsToFilename[ `${moduleName}#${_}` ] = file.targetFilename;
            }
         } );

         return { file, moduleName, moduleHidden, commentHierarchy, symbols };
      } )
      .filter( ({ file, moduleName, moduleHidden }) => {
         if( options.onlyPublicModules && ( !moduleName || moduleHidden ) ) {
            if( options.verbose ) {
               /* eslint-disable no-console */
               const name = file.sourceFilename;
               console.log( `Omitting file '${name}', because it defines no publicly visible module` );
               /* eslint-enable no-console */
            }
            return false;
         }

         return true;
      } )
      .map( ({ file, moduleName, commentHierarchy, symbols }) => {
         const transformers = createTransformers( moduleName, symbolsToFilename, symbols );

         const module = ( ( commentHierarchy.filter( isGlobal )[ 0 ] || {} ).children || [] )
            .filter( isModule )[ 0 ];

         // render Module members
         const moduleMembers = commentHierarchy
            .filter( isGlobal );
         const moduleMembersContent = moduleMembers
            .map( type =>
               ( type.children || [] )
                  .filter( not( isModule ) )
                  .map( member => ({ ...transformers, ...member, fullName: member.name }) )
                  .map( _ => isFunction( _ ) ? templates.function( _ ) : templates.property( _ ) )
                  .join( '\n\n' )
            )
            .join( '' );
         const moduleMembersToc = [].concat( ...moduleMembers
            .map( type =>
               ( type.children || [] )
                  .filter( not( isModule ) )
                  .map( member => ({
                     link: `#${member.name}`,
                     name: member.name + ( isFunction( member ) ? '()' : '' )
                  }) )
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

         const typeWithChildren = types => renderTypesWithChildren( types, templates, transformers );

         return {
            ...file,
            markdown: reduceEmptyLines( templates.doc( {
               ...transformers,
               module,
               moduleMembersToc: templates.toc( { entries: moduleMembersToc } ).trim(),
               injectablesToc: renderTypesWithChildrenToc( injectables, templates.toc ),
               directivesToc: renderTypesWithChildrenToc( directives, templates.toc ),
               typesToc: renderTypesWithChildrenToc( types, templates.toc ),
               moduleMembers: moduleMembersContent,
               injectables: typeWithChildren( injectables ),
               directives: typeWithChildren( directives ),
               types: typeWithChildren( types )
            } ) )
         };
      } );

   duplicateModuleChecker.check();

   return result;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createTransformers( moduleName, symbolsToFilename, localSymbols ) {
   const _replaceLinks = text => {
      return text.replace(
         LINK_MATCHER,
         ( _, $plain, $moduleName = '', $localItem, $localItemProp, $parens = '', $title = '' ) => {
            let link = '';
            link += $localItem ? `#${$localItem}` : '';
            link += $localItemProp ? `.${$localItemProp}` : '';

            const linkText = $title.trim() ? $title.trim() : $moduleName + link + $parens;
            if( $moduleName && $moduleName !== moduleName ) {
               link = `${symbolsToFilename[ $moduleName ] || '-unknown-'}${link}`;
            }
            if( $plain ) {
               return `[${linkText}](${link})`;
            }
            return `[\`${linkText}\`](${link})`;
         } );
   };
   const _renderType = type => {
      if( localSymbols.indexOf( type ) !== -1 ) {
         return `[\`${type}\`](#${type})`;
      }
      if( type in symbolsToFilename ) {
         return `[\`${type}\`](${symbolsToFilename[ type ]}#${type})`;
      }
      return '`' + type + '`';
   };
   const _renderTypes = obj => ( obj.types || [] ).map( _renderType ).join( ', ' );
   const _renderPropertyType = dox => {
      const types = ( dox.tags.filter( _ => _.type === 'type' )[ 0 ] || {} ).types || [];
      return _renderType( types[ 0 ] );
   };
   return { _replaceLinks, _renderType, _renderTypes, _renderPropertyType };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createSwigTemplates() {
   swig.setFilter( 'wrap', ( input, wrapper, condition ) =>
      condition === undefined || condition ? wrapper + input + wrapper : input
   );
   swig.setFilter( 'if', ( input, condition ) => condition ? input : '' );
   swig.setFilter( 'replaceLinks', ( input, condition ) => condition ? input : '' );
   swig.setDefaults( {
      autoescape: false,
      locals: {
         isFunction
      }
   } );

   const templateDir = templateName => path.join( __dirname, `../templates/${templateName}.md.tmpl` );
   return {
      doc: swig.compileFile( templateDir( 'doc_template' ) ),
      toc: swig.compileFile( templateDir( 'toc_template' ) ),
      type: swig.compileFile( templateDir( 'type_template' ) ),
      function: swig.compileFile( templateDir( 'function_template' ) ),
      property: swig.compileFile( templateDir( 'property_template' ) )
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function renderTypesWithChildren( types, templates, locals ) {
   return types.map( type => {
      const members = ( type.children || [] )
         .map( member => {
            const renderData = ({ ...locals, ...member, fullName: `${type.name}.${member.name}` });
            return templates[ isFunction( member ) ? 'function' : 'property' ]( renderData );
         } )
         .join( '' );
      return { ...locals, ...type, members };
   } )
   .map( templates.type ).join( '' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function renderTypesWithChildrenToc( types, tocTemplate ) {
   const tocString = types.map( type =>
      ({
         name: type.name,
         link: `#${type.name}`,
         children: ( type.children || [] )
            .map( member => {
               const commonPrefix = `${type.name}.${member.name}`;
               return {
                  link: `#${commonPrefix}`,
                  name: commonPrefix + ( isFunction( member ) ? '()' : '' )
               };
            } )
      })
   );

   return tocTemplate( { entries: tocString } ).trim();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function reduceEmptyLines( string ) {
   return string.replace( /(\n{2,})/g, '\n\n' ).replace( /(\n{2,})$/, '\n' );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createDuplicateModuleChecker( warn ) {
   const knownModules = {};

   return {
      register( moduleName, filename ) {
         if( !( moduleName in knownModules ) ) {
            knownModules[ moduleName ] = [];
         }
         knownModules[ moduleName ].push( filename );
      },
      check() {
         Object.keys( knownModules ).forEach( moduleName => {
            const files = knownModules[ moduleName ];
            if( files.length >= 2 ) {
               warn( `Duplicate definition of module ${moduleName}. Found in these files:\n` +
                  `   - ${files.join( '\n   - ' )}` );
            }
         } );
      }
   };
}
