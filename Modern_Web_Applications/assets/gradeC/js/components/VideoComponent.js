var VideoComponent = function( global, $ ) { 
  bc.core.extendClass( VideoComponent, Component );
  
  function VideoComponent( element ) {
    this.id = 'video';
    this.parent.apply( VideoComponent, [this, element] );
  }

  VideoComponent.prototype.views = {

    'videos': {
      template: 'components/video/videos',
      render: function( tmpl, element ) {
        var that = this;

        that.element.html( Mustache.to_html(tmpl, that.wrapData(that.data)) );
      }
    },

    'video': {
      template: 'components/video/video',
      render: function( tmpl, element ) {
        var that = this;
        var page = that.wrapPage('video_page', Mustache.to_html(tmpl, that.wrapData(bc.core.session('video'))) );

        bc.ui.forwardPage( page, { transitionType: bc.ui.transitions.SLIDE_LEFT } );

        brightcove.createExperiences();
      }
    }

  };

  VideoComponent.prototype.init = function() {
    this.originalHTML = this.element.html();

    var location = bc.core.cache( 'location' );
    var token = bc.core.cache( 'settings' ).videoApiToken;
    var url = bc.core.cache( 'settings' ).videoApiFormat;

    // Assign the feed from the settings
    this.namedFeed = url.format( token, location.feeds.video );

    // Initialize the data refresh
    bc.core.refresh();

    // Set the view
    this.view = this.element.data( 'view' );

    // Set the page
    this.page = global.location.hash ? global.location.hash : null;

    // Transition to the correct page
    if( this.page ) { this.view = this.page.slice( 1 );
      this.element.attr( 'data-view', this.view );
    }

    // Load BrightCove HTML5 player code
    if( this.brightcovePlayerCompatible() ) {
      this.loadBrightcoveExperienceFile();
    }

    if( !this.hasInit ) {
      this.hasInit = true;
      this.registerEventListeners();
    }
  };
  
  VideoComponent.prototype.registerEventListeners = function() {
    var that = this;

    that.element.delegate( '.event', 'click', function( evt ) {
      evt.preventDefault();
      evt.stopPropagation();

      var idx = that.element.find( '.event' ).index( this );
      bc.core.session( 'event', that.data.rsp.content.events[idx], true );

      that.setView( 'detail' );

      that.render();

      return false;
    });

    $( '.back' ).live( 'click', function( evt ) {
      bc.ui.backPage({ transitionType: bc.ui.transitions.SLIDE_RIGHT });
    });

    that.element.delegate('.video', 'click', function() {
      var idx = that.element.find( '.video' ).index( this );
      bc.core.session('video', that.data.videos[idx]);

      that.setView( 'video' );

      that.render();
    });

    $( that ).bind( 'newcomponentinfo', function( evt, info ) {
      that.data = info.data.items[0];

      // FIXME: Urls are broken, the / are escaped, potential fix here
      $.each( that.data.videos, function( i, video ) {
        that.data.videos[i] = video;
      });

      that.render();
    });
  };
  
  return VideoComponent;
}( this, this.jQuery );
