var fs = require( 'fs' );
var path = require( 'path' );
var parser = require( 'uglify-js' ).parser;
var uglify = require( 'uglify-js' );
var mustache = require( 'mustache' );

// Constants
var PREFIX = 'build/';
var CONFIG = 'configuration.json';
var OUT = '.views/';

// Read in command-line arguments
var args = process.argv;
var step = args[2];

// Read in configuration file
var config = JSON.parse( fs.readFileSync(PREFIX + CONFIG).toString() );

// Handle step
if( step === "production" ) {
  return production();
}
return development();

// Taken from uglify-js binary
function show_copyright(comments) {
  var ret = "";
  for (var i = 0; i < comments.length; ++i) {
    var c = comments[i];
    if (c.type == "comment1") {
      ret += "//" + c.value + "\n";
    } else {
      ret += "/*" + c.value + "*/";
    }
  }
  return ret;
}

function build( step ) {
  var scripts, stylesheets;

  // Iterate all views
  fs.readdirSync( PREFIX + 'views' ).forEach(function( file ) {
    var customPath = [ PREFIX, step, '/', file.split('.html').shift() ].join('');
    var view = '';

    // Check for development/production files in sub folders first
    if( path.existsSync(customPath) ) {
      // Load in custom script/stylesheets
      scripts = fs.readFileSync( customPath + '/scripts.html' ).toString();
      stylesheets = fs.readFileSync( customPath + '/stylesheets.html' ).toString();
    }
    else {
      scripts = fs.readFileSync( PREFIX + step + '/scripts.html' ).toString();
      stylesheets = fs.readFileSync( PREFIX + step + '/stylesheets.html' ).toString();
    }

    // Replace scripts
    view = fs.readFileSync( PREFIX + 'views/' + file ).toString();
    view = mustache.to_html( view, { 'scripts': scripts, 'stylesheets': stylesheets } );
    
    fs.writeFileSync( OUT + file, view );
  });
}

function development() {

  BUILD: {
    build( 'development' );
  }

}

function production() {

  MINIFY: {
    var minifiedScripts = '';
    var minifiedStylesheets = '';

    config.scripts.forEach(function( script ) {
      var scriptContents = fs.readFileSync( script ).toString();
      var tok = parser.tokenizer( scriptContents )();
      var copyright = show_copyright( tok.comments_before );

      minifiedScripts += '\n' + copyright + '\n' + uglify( scriptContents );
    });

    fs.writeFileSync( config.output, minifiedScripts );
  }

  BUILD: {
    build( 'production' );
  }
  
}
