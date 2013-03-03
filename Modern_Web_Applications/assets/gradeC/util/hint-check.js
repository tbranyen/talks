var nodejshint = require( './nodejshint.js' ).test,

files = [
  // Helpers
  'js/boot.js',

  // Components
  'js/components/EventComponent.js',
  'js/components/NewsComponent.js',
  'js/components/PhotoComponent.js',
  'js/components/WeatherComponent.js',
  'js/components/VideoComponent.js'
];

nodejshint( files, function( failures ) {
  if( failures ) {
    process.exit( 0 );
  }
  else {
    process.exit( 1 );
  }
});
