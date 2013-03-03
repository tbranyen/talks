var NewsComponent = function( global, $ ) { 
  bc.core.extendClass( NewsComponent, Component );
  
  function NewsComponent( element ) {
    this.id = 'news';
    this.parent.apply( NewsComponent, [this, element] );

    this.originalHTML = this.element.html();
  }

  NewsComponent.prototype.views = {

    'categories': {
      template: 'components/news/categories',
      render: function( tmpl ) {
        var that = this;

        that.element.html( Mustache.to_html(tmpl, { categories: that.wrapData(that.data) }) );

        bc.ui.enableScrollers();

        that.element.parent().bind( 'click', $.noop );
      }
    },

    'category': {
      template: 'components/news/category',
      render: function( tmpl ) {
        var that = this;
        var category = bc.core.session( 'category' );
        var data = that.wrapData( { category: category.data }, { category_name: category.name } );
        var page = that.wrapPage( 'news_page', Mustache.to_html(tmpl, data) );

        bc.ui.forwardPage( page, { transitionType: bc.ui.transitions.SLIDE_LEFT } );
      }
    },

    'article': {
      template: 'components/news/article',
      render: function( tmpl, element ) {
        var that = this;
        var category = bc.core.session( 'category' );
        var article = bc.core.session( 'article' );
        var hasGallery = article.media_content && article.media_content.length
          ? [true] : false;

        var data = that.wrapData( article, { category_name: category.name, has_gallery: hasGallery } );
        var page = that.wrapPage( 'news_page', Mustache.to_html(tmpl, data) );

        bc.ui.forwardPage( page, { transitionType: bc.ui.transitions.SLIDE_LEFT } );
      }
    }

  };

  // Take any number of namedFeeds
  // Create stack, serialize execution, render content
  NewsComponent.prototype.fetchMultipleFeeds = function() {
    var stack = [];

    function processFeed( obj ) {
      var that = this;
      var title = obj[0];
      var feed = obj[1];

      that.namedFeed = feed.named;
      
      $( that ).one( 'newcomponentinfo', function( evt, info ) {
        var categories = bc.core.session( 'categories' );
        var data = {};
        data[title] = info.data;
        that.normalizePhotos( info.data );

        // Normalize dates
        if( info.data ) {
          $.each( info.data, function( i, obj ) {
            var date = Date.parse( obj.pubDate );
            if( date ) {
              obj.pubDate = date.toString( 'MMMM d, yyyy - h:mmtt' );
            }
            info.data[i] = obj;
          });
        }

        // Use custom property so as to not override the current data object
        categories = $.extend( categories, data );

        // Save back to session
        bc.core.session( 'categories', categories );

        if( stack.length ) {
          stack.shift()();
        }
        else {
          that.render();
        }
      });

      // Initialize the data refresh
      bc.core.refresh();
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

  NewsComponent.prototype.init = function() {
    var news = bc.core.cache( 'location' ).feeds.news;

    // Set empty object as feeds
    bc.core.session( 'categories', {} );

    // Normalize the news object
    var normalized = [];
    news.forEach(function( item ) {
      normalized.push({ id: item[0], title: item[1].title });
    });

    // Set the current data to be the actual feeds object
    this.data = normalized;

    // Assign multiple feeds, store in single data object
    this.fetchMultipleFeeds.apply(this, news);

    // Set the view
    this.view = this.element.data( 'view' );

    // Set the page
    this.page = global.location.hash ? global.location.hash : null;

    // Transition to the correct page
    if( this.page ) {
      this.view = this.page.slice( 1 );
      this.element.attr( 'data-view', this.view );
    }

    if( !this.hasInit ) {
      this.hasInit = true;
      this.registerEventListeners();
    }
  };

  NewsComponent.prototype.registerEventListeners = function() {
    var that = this;
    var newsPage = $( '#news_page' );

    $( document ).delegate( '.category', 'click', function( evt ) {
      var idx = $( '.category' ).index( this );
      var categories = bc.core.session( 'categories' );
      var category = { data: categories[that.data[idx].id], name: that.data[idx].title };

      // Set ad placement
      var inc = 0;
      $.each( category.data, function( i, e ) {
        if ( inc > 0 ) {
          category.data[i].show_ad = true;
          inc = 0;
        }
        else {
          category.data[i].show_ad = false;
          inc = inc + 1;
        }
      });

      bc.core.session( 'category', category );

      that.setView( 'category' );
      that.render();

      return false;
    });

    $( document ).delegate( '.article', 'click', function( evt ) {
      var idx = $( '.article' ).index( this );
      var category = bc.core.session( 'category' );

      bc.core.session( 'article', category.data[idx] );

      that.setView( 'article' );
      that.render();
    });

    $( document ).delegate( '.gallery-article', 'click', function( evt ) {
      var article = bc.core.session( 'article' );
      var gallery = { media_content: article.media_content };

      // Normalize
      gallery.count = article.media_content.length;
      bc.core.session( 'gallery', gallery );
      bc.components.photos.setView( 'gallery' );
      bc.components.photos.render();
    });

    $( document ).delegate( '.back', 'click', function( evt ) {
      bc.ui.backPage({ transitionType: bc.ui.transitions.SLIDE_RIGHT });
    });
  };
  
  return NewsComponent;
}( this, this.jQuery );
