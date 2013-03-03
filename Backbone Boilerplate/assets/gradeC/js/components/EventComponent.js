var EventComponent = function( global, $ ) { 
  bc.core.extendClass( EventComponent, Component );
  
  function EventComponent( element ) {
    this.id = 'event';
    this.parent.apply( EventComponent, [this, element] );

    this.originalHTML = this.element.html();
  }

  EventComponent.prototype.views = {

    'events': {
      template: 'components/event/events',
      render: function( tmpl, element ) {
        var that = this;
        var events = bc.core.session( 'events' );
        console.log(events.today);
        that.element.html( Mustache.to_html(tmpl, that.wrapData({
          today: events.today.rsp.content.events,
          next: events.next.rsp.content.events
        })));

        bc.ui.enableScrollers();
      }
    },

    'detail': {
      template: 'components/event/detail',
      render: function( tmpl, element ) {
        var that = this;
        var page = this.wrapPage( 'detail_page', Mustache.to_html(tmpl, that.wrapData(bc.core.session('event'))) );

        bc.ui.forwardPage( page, { transitionType: bc.ui.transitions.SLIDE_LEFT } );
      }
    }

  };

  // Take any number of namedFeeds
  // Create stack, serialize execution, render content
  EventComponent.prototype.fetchMultipleFeeds = function() {
    var stack = [];

    function processFeed( obj ) {
      var that = this;
      var title = obj[0];
      var feed = obj[1];

      that.namedFeed = feed;

      // Initialize the data refresh
      bc.core.refresh();
      
      $( that ).one( 'newcomponentinfo', function( evt, info ) {
        var events = bc.core.session( 'events' );
        var data = {};
        data[title] = info.data;

        if( info.data ) {
          // Normalize dates
          $.each( info.data.rsp.content.events, function( i, obj ) {
            var date = new Date(Date._parse( obj.starttime ));
            obj.starttime = date.toString( 'ddd htt, MMMM d' );
            info.data.rsp.content.events[i] = obj;
          });

          // Normalize venues
          var venues = {};
          $.each( info.data.rsp.content.venues, function( i, obj ) {
            venues[obj.id] = obj;
          });

          $.each( info.data.rsp.content.events, function( i, obj ) {
            obj.venue = venues[obj.venue_id];
          });

          // Normalize gallery
          $.each( info.data.rsp.content.events, function( i, obj ) {
            if( obj.images && obj.images.length ) {
              obj.has_gallery = true;
              obj.count = obj.images.length;
              obj.thumbnail = obj.images[0].url;
            }
            //obj.venue = venues[obj.venue_id];
          });
        }

        // Use custom property so as to not override the current data object
        events = $.extend( events, data );

        // Save back to session
        bc.core.session( 'events', events );

        if( stack.length ) {
          stack.shift()();
        }
        else {
          that.render();
        }
      });
    }

    return function() {
      var that = this; 
      [].slice.call(arguments).forEach(function( arg ) {
        stack.push( processFeed.bind(that, arg) );
      });

      if( stack.length ) {
        stack.shift()();
      }
    };

  }();

  EventComponent.prototype.init = function() {
    var url = bc.core.cache( 'settings' ).zventsFormat;
    var key = bc.core.cache( 'settings' ).zventsApi;
    var location = bc.core.cache( 'location' );

    // Assign the feed from the settings
    this.namedFeed = url.format( key, location.zip, '7 days' );

    // Initialize the data refresh
    this.fetchMultipleFeeds.apply(this, [
      ['today', url.format( key, location.zip, '1 days' )],
      ['next', url.format( key, location.zip, 'next 7 days' )]
    ]);

    // Set the view
    this.view = this.element.data( 'view' );

    // Set the page
    this.page = global.location.hash ? global.location.hash : null;

    // Transition to the correct page
    if( this.page ) { this.view = this.page.slice( 1 );
      this.element.attr( 'data-view', this.view );
    }

    if( !this.hasInit ) {
      this.hasInit = true;
      this.registerEventListeners();
    }
  };
  
  EventComponent.prototype.registerEventListeners = function() {
    var that = this;

    that.element.delegate( '.event', 'click', function( evt ) {
      evt.preventDefault();
      evt.stopPropagation();

      var idx;
      var events = bc.core.session( 'events' );

      if( $(this).hasClass('today') ) {
        idx = that.element.find( '.today' ).index( this );
        bc.core.session( 'event', events.today.rsp.content.events[idx], true );
      }
      else {
        idx = that.element.find( '.next' ).index( this );
        bc.core.session( 'event', events.next.rsp.content.events[idx], true );
      }

      that.setView( 'detail' );

      that.render();

      return false;
    });

    $( document ).delegate( '.back', 'click', function( evt ) {
      bc.ui.backPage({ transitionType: bc.ui.transitions.SLIDE_RIGHT });
    });

    $( document ).delegate( '.gallery-event', 'click', function( evt ) {
      var event = bc.core.session( 'event' );
      var gallery = { media_content: event.images };

      // Normalize
      gallery.count = event.images.length;
      bc.core.session( 'gallery', gallery );
      bc.components.photos.setView( 'gallery' );
      bc.components.photos.render();
    });

    //$( that ).bind( 'newcomponentinfo', function( evt, info ) {
    //  that.data = info.data;

    //  // Normalize dates
    //  $.each( that.data.rsp.content.events, function( i, obj ) {
    //    var date = new Date(Date._parse( obj.starttime ));
    //    obj.starttime = date.toString( 'ddd htt, MMMM d' );
    //    that.data.rsp.content.events[i] = obj;
    //  });

    //  that.render();
    //});
  };
  
  return EventComponent;
}( this, this.jQuery );
