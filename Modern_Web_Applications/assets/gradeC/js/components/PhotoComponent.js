var PhotoComponent = function( global, $ ) { 
  bc.core.extendClass( PhotoComponent, Component );
  
  function PhotoComponent( element ) {
    this.id = 'photos';
    this.parent.apply( PhotoComponent, [this, element] );

    this.originalHTML = this.element.html();
  }

  PhotoComponent.prototype.views = {

    'home': {
      template: 'components/photos/home',
      render: function( tmpl, element ) {
        var that = this;

        var data = { galleries: that.galleries };

        that.element.html( Mustache.to_html(tmpl, that.wrapData(data)) );
        that.element.find( '.carousel .photos' ).cycle({
          pager: '.pager',
          timeout: 0
        });
      }
    },

    'galleries': {
      template: 'components/photos/galleries',
      render: function( tmpl, element ) {
        var that = this;

        var data = { photos: that.data };
        
        that.element.html( Mustache.to_html(tmpl, that.wrapData(data)) );
      }
    },

    'gallery': {
      template: 'components/photos/gallery',
      render: function( tmpl, element ) {
        var that = this;
        var gallery = bc.core.session( 'gallery' );
        var data = that.wrapData(gallery);
        var page = that.wrapPage( 'gallery_page', Mustache.to_html(tmpl, data) );

        bc.ui.forwardPage( page );
      }
    },

    'photo': {
      template: 'components/photos/photo',
      render: function( tmpl, element ) {
        var that = this;
        var page = that.wrapPage( 'gallery_page', Mustache.to_html(tmpl, bc.core.session('photo')) );

        bc.ui.forwardPage( page );
      }
    }

  };

  PhotoComponent.prototype.init = function() {
    // Assign the feed from the settings
    this.namedFeed = bc.core.cache( 'location' ).feeds.photos;

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

    if( !this.hasInit ) {
      this.hasInit = true;
      this.registerEventListeners();
    }
  };

  PhotoComponent.prototype.registerEventListeners = function() {
    var that = this;

    $( this ).bind( 'newcomponentinfo', function( evt, info ) {
      var tmp;
      that.data = info.data;

      that.normalizePhotos( that.data );

      // Normalize gallery into nested arrays, 4 per screen
      that.galleries = [];
      $.each( that.data, function( i, e ) {
        if( e ) {
          // Add index & count properties
          e.idx = i+1;
          e.count = e.media_content.length;
          that.data[i] = e;

          if ( i % 4 === 0 ) {
            if( tmp ) {
              that.galleries.push({ gallery: tmp });
            }
            tmp = [];
          }

          tmp.push( e.media_thumbnail_url );
        }
        else {
          // Remove nulls
          delete that.data[i];
        }
      });

      that.render();
    });

    $( document ).delegate( '[data-view=home]', 'swipe', function( evt, direction ) {
      var idx = $( '.pager' ).find( '.activeSlide' ).index();
      if( direction === 'swipeLeft' ) {
        idx = idx + 1;
        $( '.pager' ).find( 'a' ).eq( idx ).trigger( 'click' );
      }
      else {
        idx = idx - 1;
        $( '.pager' ).find( 'a' ).eq( idx ).trigger( 'click' );
      }
    });
    
    $( document ).delegate( 'li.gallery', 'click', function( evt ) {
      var idx = $( 'li.gallery' ).index( this );
      bc.core.session( 'gallery', that.data[idx], true );

      that.setView( 'gallery' );
      that.render();
    });

    $( document ).delegate( 'li.photo', 'click', function( evt ) {
      var idx = $( this ).index();
      var gallery = bc.core.session( 'gallery' );

      gallery.media_content[idx].idx = idx+1;
      gallery.media_content[idx].count = gallery.count;
      gallery.media_content[idx].title = gallery.title;
      gallery.media_content[idx].author = gallery.author;
      bc.core.session( 'photo', gallery.media_content[idx], true );

      that.setView( 'photo' );
      that.render();
    });

    $( document ).delegate( '.photo-full', 'swipe', function( evt, direction ) {
      var gallery = bc.core.session( 'gallery' );
      var photo = $( this );
      var idx = global.parseInt( photo.attr('data-idx'), 10 ) - 1;
      var count = global.parseInt( photo.attr('data-count'), 10);

      if( direction === 'swipeLeft' ) {
        idx = (idx+1).mod( count );
      }
      else if( direction === 'swipeRight' ) {
        idx = (idx-1).mod( count );
      }

      photo.attr( 'data-idx', idx + 1 );
      photo.parent().find('.index').html( idx + 1 );

      photo.find('img').attr( 'src', gallery.media_content[idx].url );
    });
  };
  
  return PhotoComponent;
}( this, this.jQuery );
