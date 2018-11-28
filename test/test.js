const { readdirSync, readFileSync, writeFileSync, mkdirSync } = require( 'fs' );
const { basename, extname, resolve } = require( 'path' );
const { createMarkdownForFiles } = require( '../lib/doc-builder' );
const { expect } = require( 'chai' );


const tests = readdirSync( resolve( __dirname, 'data' ) )
   .filter( file => !!extname( file ).match( /\.(js|md)$/ ) )
   .reduce( ( acc, file ) => {
      const test = file.replace( /\.[a-z]+$/, '' );
      return acc.includes( test ) ? acc : [ ...acc, test ];
   }, [] )
   .map( test => ({
      name: test,
      fileInfo: readInputFileForTest( test ),
      expectedMarkdown: readOutputFileForTest( test )
   }) );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const tempDirectory = resolve( __dirname, 'data', 'out' );
mkdirSync( tempDirectory );

beforeEach( () => {
   // we run create the markdown for all files in a single step, to be able to test cross references between
   // different source files
   createMarkdownForFiles( tests.map( test => test.fileInfo ) )
      .forEach( ( result, index ) => {
         tests[ index ].actualMarkdown = result.markdown || '';
      } );
} );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

tests.forEach( test => {

   it( `${test.name} creates the expected output`, () => {
      writeTemporaryResult( test.name, test.actualMarkdown );

      expect( test.actualMarkdown ).to.equal( test.expectedMarkdown );
   } );

} );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function readInputFileForTest( test ) {
   const sourceFilename = resolve( __dirname, 'data', `${test}.js` );
   const targetFullFilename = resolve( __dirname, 'data', `${test}.md` );

   return {
      sourceFilename,
      sourceContent: readFileSync( sourceFilename ).toString(),
      targetFilename: basename( targetFullFilename ),
      targetFullFilename
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function readOutputFileForTest( test ) {
   return readFileSync( resolve( __dirname, 'data', `${test}.md` ) ).toString();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function writeTemporaryResult( test, markdown ) {
   const tempFilename = resolve( tempDirectory, `${test}.md` );
   try {
      writeFileSync( tempFilename, markdown );
   }
   catch( err ) {
      console.warn( 'Error writing temporary file:' + err.message );
   }
}
