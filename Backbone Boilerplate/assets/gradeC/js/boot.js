(function( window, $ ) {

  var PREFIX = '../';
  var MANIFEST = 'manifest.xml';
  var SETTINGS = 'settings.json';

  // jQuery doesn't provide a method to defer window.load,
  // return a promise to resolve once window has loaded
  var winLoad = function() {
    return $.Deferred(function( def ) {
      $( window ).bind( 'load', def.resolve );
    }).promise();
  };

  function bindEvents( locationPage, homePage, locations, edition, seekingPage ) {
    var locationButton = $( '.find-location' );
    var resetButton = $( '.reset' );
    var changeButton = $( '.change-edition' );
    var settings = bc.core.cache( 'settings' );

    // Allow people to change the edition
    changeButton.bind( 'click', function() {
      bc.ui.forwardPage( locationPage );
    });

    // Obtain location
    locationButton.bind( 'click', function() {
      bc.ui.forwardPage( seekingPage );

      bc.device.getLocation(
        // Success
        function( coords ) {
          var latlng = new google.maps.LatLng( +coords.latitude, +coords.longitude );
          var geocoder = new google.maps.Geocoder();
          var location;

          geocoder.geocode({ latLng: latlng }, function(data, status) {
            if( data && data[0].address_components ) {
              $.each( data[0].address_components, function( i, e ) {
                if( ~e.types.indexOf('locality') ) {
                  location = e.long_name;
                  return;
                }
              });

              if( location ) {
                for( i=0, len=locations.length; i<len; i++ ) {
                  if( locations[i].name === location ) {
                    location = locations[i];
                    break;
                  }
                }

                bc.core.cache( 'location', location );

                // Set the initial location name
                edition.find( 'h1' ).html( location.name );

                // Initialize all components on the page
                $.each(bc.components, function( key, component ) {
                  component.reset();
                  component.init();
                });

                // Exit full screen
                bc.device.isFullScreen(function( fullscreen ) {
                  if( fullscreen === 'true' ) {
                    bc.device.exitFullScreen();
                  }
                });

                // Transition to home page
                bc.ui.forwardPage( homePage );

                // Reset index position
                this.selectedIndex = 0;
              }
              else {
                bc.device.alert( 'Location not found' );

                // Transition back to location page
                bc.ui.forwardPage( locationPage );
              }
            }
            else {
              bc.device.alert( 'Geocoding data unavailable' );

              // Transition back to location page
              bc.ui.forwardPage( locationPage );
            }
          });
        },
        // Error
        function() {
          bc.device.alert( 'Unable to fetch location.' );

          // Transition back to location page
          bc.ui.forwardPage( locationPage );
        }
      );

    });

    // Before transitioning to location, fill the dropdown
    locations.forEach(function( location ) {
      locationPage.find( 'select' ).append( '<option>' + location.name + '</option>' );
    });

    resetButton.bind( 'click', function() {
      window.sessionStorage.clear();
      window.localStorage.clear();
      window.alert('reset');
    });

    // Added change event
    locationPage.find( 'select' ).bind( 'change', function() {
      var location, i, len;
      for( i=0, len=locations.length; i<len; i++ ) {
        if( locations[i].name === this.value ) {
          location = locations[i];
          break;
        }
      }

      bc.core.cache( 'location', location );

      // Set the initial location name
      edition.find( 'h1' ).html( location.name );

      // Initialize all components on the page
      $.each(bc.components, function( key, component ) {
        component.reset();
        component.init();
      });

      // Exit full screen
      bc.device.isFullScreen(function( fullscreen ) {
        if( fullscreen === 'true' ) {
          bc.device.exitFullScreen();
        }
      });

      // Transition to home page
      bc.ui.forwardPage( homePage );

      // Reset index position
      this.selectedIndex = 0;
    });
  }

  // Ensure window has loaded and that manifest/settings have been fetched
  $.when(
    winLoad(),
    $.get( PREFIX + MANIFEST ),
    $.getJSON( PREFIX + SETTINGS )
  ).then(function( load, manifest, settings ) {
    var locationPage = $( '#location_page' );
    var homePage = $( '#home_page' );
    var locations = settings[0].locations;
    var location = bc.core.cache( 'location' );
    var edition = $( '.community-edition' );
    var seekingPage = $( '#seeking_page' );

    // Cache the manifest and settings
    bc.core.cache( 'manifest', manifest[2].responseText );
    bc.core.cache( 'settings', settings[0] );
    bc.core.session( 'loaded', true );

    // Handle event binding
    bindEvents( locationPage, homePage, locations, edition, seekingPage );

    // Deal with the home page
    if( homePage.length ) {

      if( !bc.core.session('locations') ) {
        bc.core.session( 'locations', locations );
      }

      if( bc.core.cache('location') ) {
        // Set the initial location name
        edition.find( 'h1' ).html( location.name );

        // Init all the components
        $.each(bc.components, function( key, component ) {
          component.init();
        });

        // Redirect to homepage
        bc.ui.forwardPage( homePage );
        bc.device.exitFullScreen();

        return;
      }

      bc.device.enterFullScreen();
    }
    // All other sub pages
    else {
      bc.device.exitFullScreen();

      function reload() {
        if( bc.core.cache('location') ) {
          $.each(bc.components, function( key, component ) {
            component.init();
          });
        }
        else {
          window.setTimeout(reload, 80);
        }
      }
      reload();

      // Dirty hack to ensure weather is shown on non-dynamic pages
      var weather, temp, icon; 
      var interval = window.setInterval(function() {
        if( weather = bc.core.cache('weather') ) {
          $( '.temp' ).html( weather.current.temp );  
          $( '.weather-thumbnail' ).attr( 'src', weather.forecast[0].thumbnail );  

          window.clearInterval( interval );
        }
      }, 500);
    }
  });

})( this, this.jQuery );
