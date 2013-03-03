var WeatherComponent = function( global, $ ) { 
  bc.core.extendClass( WeatherComponent, Component );
  
  function WeatherComponent( element ) {
    this.id = 'weather';
    this.parent.apply( WeatherComponent, [this, element] );

    this.originalHTML = this.element.html();
  }

  WeatherComponent.prototype.views = {

    'home': {
      template: 'components/weather/home',
      render: function( html ) {
        var that = this;
        var weather = bc.core.cache( 'weather' );

        var data = {};
        if ( weather && weather.current && weather.forecast ) {
          data = {
            current_temp: weather.current.temp, high: weather.forecast[0].high,
            low: weather.forecast[0].low,
            thumbnail: weather.forecast[0].thumbnail
          };
        }

        that.element.html( Mustache.to_html(html, data) );
      }
    },

    'forecast': {
      template: 'components/weather/forecast',
      render: function( tmpl, element ) {
        var that = this;
        var weather = bc.core.cache('weather');
        var data = {};

        if ( weather && weather.current && weather.forecast ) {
          data = {
            current_temp: weather.current.temp,
            high: weather.forecast[0].high,
            low: weather.forecast[0].low,
            thumbnail: weather.forecast[0].thumbnail,
            forecast: weather.forecast
          };

          data = that.wrapData( data );
        }

        var page = that.wrapPage( 'weather_page', Mustache.to_html(tmpl, data) );

        bc.ui.forwardPage( page, {transitionType: bc.ui.transitions.SLIDE_LEFT} );
      }
    },

    'header': {
      template: 'components/weather/header',
      render: function( tmpl, element ) {
        var that = this;
        var weather = bc.core.cache('weather');
        var data = {};
        
        if ( weather && weather.current && weather.forecast ) {
          data = {
            current_temp: weather.current.temp,
            thumbnail: weather.forecast[0].thumbnail,
          };

          data = that.wrapData( data );
        }

        that.element.html( Mustache.to_html(tmpl, data) );
      }
    }

  };

  WeatherComponent.prototype.fetchXML = function( url ) {
    var that = this;

    bc.device.fetchContentsOfURL( url, function( data ) {
      $( that ).trigger( 'newcomponentinfo', [{ data: data }] );
    });
  };

  WeatherComponent.prototype.init = function() {
    var url = bc.core.cache( 'settings' ).weatherApiFormat;
    var zip = bc.core.cache( 'location' ).zip;

    // Assign the feed from the settings
    this.fetchXML( url.format(zip) );

    // Set the view
    this.view = this.element.data( 'view' );

    // Set the page
    this.page = global.location.hash ? global.location.hash : null;

    // Transition to the correct page
    if( this.page ) {
      this.view = this.page.slice( 1 );
      this.element.attr( 'data-view', this.view );
    }

    if( bc.core.cache('weather') ) {
      this.render();
    }

    if( !this.hasInit ) {
      this.hasInit = true;
      this.registerEventListeners();
    }
  };
  
  WeatherComponent.prototype.registerEventListeners = function() {
    var that = this;

    that.element.bind( 'click', function( evt ) {
      that.setView( 'forecast' );
      that.render();
    });

    $( this ).bind( 'newcomponentinfo', function( evt, info ) {
      var data = $( $.parseXML(info.data) );
      var normalized = { current: {}, forecast: [] };
      var current = data.find( 'item' ).eq( 0 );

      // Set the current temperature
      normalized.current.temp = current.find( 'title' ).text().split(' ').pop();

      // Get all days, minus the first item since its the current weather
      data.find( 'item' ).slice( 1 ).each(function() {
        var item = $( this );
        var desc = item.find( 'description' ).text();
        var highslows = desc.split(';');
        var day = Date.parse( item.find( 'title' ).text().split(' ').shift() ).toString( 'dddd' );
        var thumbnail = this.getElementsByTagName( 'thumbnail' )[0].getAttribute( 'url' );
        
        normalized.forecast.push({ day: day, high: highslows[0].split(':').pop(), low: highslows[1].split(':').pop(), thumbnail: thumbnail });
      });

      bc.core.cache( 'weather', normalized );

      that.render();
    });
  };
  
  return WeatherComponent;
}( this, this.jQuery );
