/*global bc:true atob:false*/
/*jshint indent:2, browser: true, white: false devel:true undef:false*/

/**
 * Brightcove UI provides functions that interact with the DOM.  This includes initializing and managing
 * elements for momentum scrolling, functions to help transition between pages, and helper functions to draw common UI 
 * elements (for example an AJAX loader).
 * @namespace
 * @requires jquery-1.5.min.js
 * @requires iscroll-min.js 
 * @requires brightcove.mobile.core.js
 * @requires brightcove.mobile.utils.js 
 * @requires brightcove.mobile.events.js  
 */
bc.ui = {};

( function( $, undefined ) {
  
  var _transitionTimeout,
      _pendingTransition,
      _currentTransitionDirection,
      TRANSITION_FORWARD = "forwardPage",
      TRANSITION_BACK = "back";
      _pendingTransition,
      _iScrollOptions = {
        "hideScrollbar": true
      };
  
  /** 
   * The type of transitions that we support.  
   * @namespace
   */
  bc.ui.transitions = {};
  /** Transition type of SLIDE_LEFT will slide the current page off the screen to the left. */
  bc.ui.transitions.SLIDE_LEFT = 0;
  /** Transition type of SLIDE_RIGHT will slide the current page off the screen to the right. */
  bc.ui.transitions.SLIDE_RIGHT = 1;
  
  /**
   * The possible orientation directions.
   * @namespace
   */
  bc.ui.orientation = {};
  /** The view is being displayed in the portrait mode. */
  bc.ui.orientation.PORTRAIT = "1";
  /** The view is being rendered as if it were rotated 180 degrees. */  
  bc.ui.orientation.PORTRAIT_UPSIDEDOWN = "2";
  /** The view is being rendered as if it were rotated 270 degrees clockwise. */  
  bc.ui.orientation.LANDSCAPE_LEFT = "3";
  /** The view is being rendered as if it were rotated 90 degrees clockwise. */  
  bc.ui.orientation.LANDSCAPE_RIGHT = "4";
  
  /** 
   * An array that keeps track of the page history.  For example if our first page is a list of videos and then when we click
   * on a item it transitions (using the bc.ui.forwardPage function) us to a video detail page, we would have two pages in our bc.ui.pageStack.
   * The first item being the original page and the second the new page we transitioned to, $detailsPage in this example.
   */
  bc.ui.pageStack = [];
  
  /**
   * Tracks whether or not the current view is in transition.
   */
  bc.ui.inTransition = false;
  
  /** The currently active page, meaning the page that is currently in view.*/
  bc.ui.currentPage = undefined;
  
  $( bc ).bind( "init", function() {
    if( $( '.page-active' ).length === 0 ) {
      $( '.page:eq(0)' ).addClass( 'page-active' );
    }
    bc.ui.currentPage = $( '.page-active:eq(0)' );
    bc.ui.enableScrollers();
    bc.ui.pageStack.push( bc.ui.currentPage );
    registerEventListeners();
  });


  /**
   * Called to refresh all existing scrollers on the page.  The Brightcove App Cloud microframework
   * attempts to call this function for the template author autoamatically as appropariate.  For example,
   * when pages are first added to the DOM, a page is transitioned to or whenever the window size changes.  
   *
   * However, there are instances where the template author will need to call this function explicitly.  Most likely
   * is when changes are made to the contents of the active page that is affects its size.  For example,
   * if the active page is a list of entries and additional entries are injected.
   *
   * @param options The options object has the possible value of allPages, which is a boolean indicating whether or not to refresh
   *                scrollers on all of the pages or just the currently active page.  The default value is false as updating all of the pages
   *                is usually unnecessary and expensive.
   * @example 
   bc.ui.refreshScrollers( { "allPages": true } ); //Will refresh the scrollers for all pages on the view.
   */
  bc.ui.refreshScrollers = function( options ) {
    var settings = { "allPages": false };
    $.extend( settings, options );
    
    if( settings.allPages ) {
      for( var i=0, len=bc.ui.pageStack.length; i < len; i++ ) {
        refreshScrollerForPage( bc.ui.pageStack[i] );
      }
    } else {
      refreshScrollerForPage( bc.ui.currentPage );
    }   
  };
  
  /** 
   * Scroll to the top of the provided momentum scroller. 
   *
   * @param $scroller A jQuery object that represents the scroller element to scroll to the top of the provider scroller.
   * @example 
   bc.ui.scrollToTop( $( '.scroller' ) ); //Scrolls the page to the top of the page.
   */
  bc.ui.scrollToTop = function( $scroller ) {
    var aScroller = $scroller.data( 'bc-scroller' );
    if ( aScroller ) {
      aScroller.scrollTo( 0, 0, 0);
    }
  };
  
  /**
   * <b>Note</b> that the App Cloud library will automatically manage the construction and destruction of these scrollers for you. Therefore
   * by default you should not have to call enableScrollers. The App Cloud libraries will call enableScrollers when it first loads and anytime we 
   * transition to a new page.
   * 
   * This function can be called to enable momentum scrolling for any element with a class of 'scroller' for the page
   * that was passed in.  If no page is passed to the function, then it defaults to the currently active page.
   *
   * @param $page An optional jQuery object that either has a class of scroller on it or is a parent of an element(s) that has
   * the class 'scroller' on it.
   * @example
   bc.ui.enableScrollers(); //Will initialize momentum scrolling for this current page.
   */
  bc.ui.enableScrollers = function( $page ) {
    $page = $page || bc.ui.currentPage;
    if ( $page ) {
      $page.find( '.scroller' ).each( function( index, scroller ) {
        setTimeout( function() { addScroller( scroller ); }, 100 );
      });
      
      if( $page.hasClass( 'scroller' ) ) {
        setTimeout( function() { addScroller( $page ); }, 100 );
      }      
    }    
  };
  
  /**
   * Transitions to the toPage parameter from the current page.  The type of transition to be applied can be passed as parameter otherwise it
   * defaults to SLIDE_LEFT.  The toPage can be passed as either a css selector, DOM Element or jQuery Object.  The passed toPage can already be part of the
   * Document or can be independent.  If it is independent then this function will dynamically insert the toPage into the DOM.  If this function
   * inserts the page into the Document then when the back function is called it will automatically remove the associated the page.  Generally speaking,
   * it is recommended to allow pages to be dynamically inserted/removed from the DOM so as to keep the DOM in-memory as small as possible.
   * 
   * Both the current page and the new page should have a CSS class of 'page' as defined in the theme file.
   * This function triggers a pageshow and a pagehide event once the transitions has completed.  The pageshow event passes the 
   * new page as data parameter, while the pagehide event passes the page we transitioned from as data parameter.
   *
   * bc.ui.forwardPage should be used when logically transitioning from one page to the next.  In addition to providing a visual
   * transition, it will add pages to the bc.ui.pageStack so that a history stack of pages can be maintained. To return to the original page (the from page)
   * call bc.ui.backPage().  
   *
   * @param toPage The page we would like to transition to.
   * @param options An object that overrides the default values of the forwardPage function.  The possible values are transitionType and injectPage.
   * "transitionType" specifies the direction that the type of transition to use during the transition, defaults to SLIDE_LEFT.
   * @example  
   $( bc ).bind( 'pageshow', function( $secondPage ) {
     //Got the pageshow event and the page we transitioned to.
   });
   
   $(bc ).bind( 'pagehide', function( $firstPage ) {
     //Got the pagehide event and the page we transition from.
   });
   
   bc.ui.forwardPage( $( '.second_page' )); //transitions to the new page
   */
  bc.ui.forwardPage = function( toPage, options ) {
    var $toPage,
        settings;
        
    //We want to protect against getting double transition events
    if( toPage === undefined || _pendingTransition !== undefined ) {
      return;
    }
    
    if( bc.ui.inTransition ) {
      if( _currentTransitionDirection !== TRANSITION_FORWARD ) {
        _pendingTransition = { 
                              "pendingFunction": "forwardPage", 
                              "page": toPage,
                              "options": options
                             };
        checkForPendingTransitions();
      }
      return;
    }
    
    // take either a string or jQuery object.  
    if ( typeof( toPage ) === "string" || toPage instanceof Element ) {
      $toPage = $( toPage );
    } else {
      $toPage = toPage;
    }

    // determine if we need to inject into the page
    if ( $toPage.parent().length === 0 ) {
      $toPage.appendTo( "body" );      
      $toPage.data( "bc-internal-injected", true ); 
    } else {
      $toPage.data( "bc-internal-injected", false );      
    }

    settings = { "transitionType": bc.ui.transitions.SLIDE_LEFT };
                       
    $.extend( settings, options );
    
    bc.ui.inTransition = true;  
    _currentTransitionDirection = TRANSITION_FORWARD;
    
    //register event listener for when the transition is complete so that we can clean things up and trigger events.
    bc.ui.currentPage.one( 'webkitTransitionEnd', function() {
      clearTimeout( _transitionTimeout );
      forwardPageEnd( $toPage );
    });
    
    // iOS sometimes drops events on the floor so we protect against this by also scheduling a callback
    _transitionTimeout = setTimeout( function() {
      bc.ui.currentPage.unbind( 'webkitTransitionEnd' );
      forwardPageEnd( $toPage );
    }, 1000);    

    bc.ui.enableScrollers( $toPage );
    changePage( bc.ui.currentPage, $toPage, settings.transitionType );
  };
  
  /**
   * Transitions from the current page back to the previous page.  The type of transition can be specified, but by default the current page will 
   * slide off the page to the right.  Once the transition has completed, the previous page is removed from the DOM in order to keep it light.
   * This function triggers a pageshow event once the transition has completed and a pagehide once the current page has been hidden.  <b>Note</b>
   * that the pagehide event is only fired if the page was not removed.  (occurs if removePage is set to false)
   *
   * bc.ui.backPage() is associated with the bc.ui.forwardPage() function.  After a previous use of bc.ui.forwardPage() to transition to a page
   * call the bc.ui.backPage() function transition back to the original page.  A common use would be when a user taps on a back button.  You would
   * call bc.ui.backPage() to transition back to the original page.
   *
   * @param options An object that contains the options that can be provided to the transition function.  The optional value is transitionType.
   * "transitionType" defines the type of transition to use when moving back to the previous page and must correspond to a value defined in bc.ui.transitions.
   * The default value is bc.ui.transitions.SLIDE_RIGHT, which will slide the current page off to the right. 
   *
   * @example  
   $( bc ).bind( 'pageshow', function( $firstPage ) {
     //Got the pageshow event and the page we transitioned to.
     //In this example the first page we started on.
   });
   
   bc.ui.backPage(); //transitions back to the first page
   
   //The above line is equivalent to calling
   // bc.ui.backPage( { 
   //  "transitionType": bc.ui.transitions.SLIDE_RIGHT,
   //  "removePage": true
   // })
   */
  bc.ui.backPage = function( options ) {
    var settings,
        $toPage,
        $fromPage = bc.ui.currentPage;
    
    if( _pendingTransition !== undefined ) {
      return;
    }
    
    //We want to protect against getting double transition events
    if( bc.ui.inTransition ) {
      if( _currentTransitionDirection !== TRANSITION_BACK ) {
        _pendingTransition = { 
                              "pendingFunction": "back", 
                              "options": options
                             };
        checkForPendingTransitions();
      }
      return;
    }
     
    settings = { "transitionType": bc.ui.transitions.SLIDE_RIGHT };
    $.extend( settings, options );
    
    // set our down state for the back button
    $fromPage.find( '.header .back-button' )
                     .addClass( 'active' );
                     
    bc.ui.inTransition = true;
    _currentTransitionDirection = TRANSITION_BACK;

    if( bc.ui.pageStack.length < 1 ) {
      bc.utils.warn( "ERROR: Calling transition back when there is only one page in the page stack" );
      return;
    }

    $toPage = bc.ui.pageStack[ bc.ui.pageStack.length - 2 ];    
    if( $toPage === undefined ) {
      bc.utils.warn( "There is no page to transition back to" );
      return;
    }

    bc.ui.currentPage.one( 'webkitTransitionEnd', function() {
      clearTimeout( _transitionTimeout );
      transitionBackEnd( $toPage );
    });

    _transitionTimeout = setTimeout( function() {
      bc.ui.currentPage.unbind( "webkitTransitionEnd" );
      transitionBackEnd( $toPage );
    }, 1000);

    setTimeout( function() { changePage( bc.ui.currentPage, $toPage, settings.transitionType ); }, 100);
  };
  
  /**
   * Returns an HTML snippet that can be used to inject a CSS3 animated spinner into the DOM.  The size and color are controlled in the theme file.
   *
   * @return An HTML snippet that represents a CSS3 animates spinner.  (AJAX loader)
   * @example
   $( 'body' ).append( bc.ui.spinner() ); //Injects an HTML spinner into the body of the page.
   */
  bc.ui.spinner = function() {
    return '<div class="spinner">' +
              '<div class="bar1"></div>' +
              '<div class="bar2"></div>' +
              '<div class="bar3"></div>' +
              '<div class="bar4"></div>' +
              '<div class="bar5"></div>' +
              '<div class="bar6"></div>' +
              '<div class="bar7"></div>' +
              '<div class="bar8"></div>' +
              '<div class="bar9"></div>' +
              '<div class="bar10"></div>' +
              '<div class="bar11"></div>' +
              '<div class="bar12"></div>' +
            '</div>';
  };
  
  /**
    * Returns the current width of the viewport.
    * @return The width of the viewport as a number.
    * @example
    var width = bc.ui.width(); //sets width to the current width of the viewport.
    */
   bc.ui.width = function() {
     if( $( "#BCDeviceWrapper" ).length > 0) { //If we are inside our developer extension return the width of the wrapper.
       return $( "#BCDeviceWrapper" ).width(); 
     } else {
       return $( window ).width();
     }
   };

   /**
    * Returns the current height of the viewport.
    * @return The height of the viewport as a number.
    @example
    var height = bc.ui.height(); //sets height to the current height of the viewport
    */
   bc.ui.height = function() {
     if( $( "#BCDeviceWrapper" ).length > 0) { //If we are inside our developer extension return the height of the wrapper.
       return $( "#BCDeviceWrapper" ).height(); 
     } else {
       return $( window ).height();
     }
   };
   
  /*
   * @private
   * Should only be used by Jasmine tests to override private variables.
   */
  bc.ui.setPrivateVariables = function( options ) {
    for( var prop in options ) {
      if( typeof options[prop] === "string" ) {
        eval( prop + " = '" + options[prop] + "'");
      } else {
        eval( prop + " = " + options[prop] );
      }
    }
  };

  function forwardPageEnd( toPage ) {
    bc.ui.inTransition = false;
    bc.ui.currentPage.removeClass( 'page-active page-transition slide-left-out slide-right-out' );
    bc.ui.currentPage.find( '.bc-active' ).removeClass( 'bc-active' );
    $( bc ).trigger( "pagehide", bc.ui.currentPage );
    
    bc.ui.pageStack.push( toPage );
    bc.ui.currentPage = toPage;
    toPage.addClass( 'page-active' ).removeClass( 'page-transition' );
    $( bc ).trigger( "pageshow", toPage );
    setTimeout( function() { bc.ui.refreshScrollers( toPage ) }, 100);
  }
  
  function transitionBackEnd( toPage ) {
    var previousPage = bc.ui.pageStack.pop(),
        removePage = previousPage.data( "bc-internal-injected" );

    bc.ui.inTransition = false;
    bc.ui.currentPage.find( '.header .back' ).removeClass( 'active' );
    bc.ui.currentPage = toPage;
    previousPage.removeData( "bc-internal-injected" );
    //If we hit memory issues start by setting the transform to nothing here.
    if ( removePage ) {
      freeRAM( previousPage );
      previousPage.css( 'display', 'none' ).remove();      
    } else {
      previousPage.removeClass( 'page-active page-transition slide-right-out slide-left-out' );        
      $( bc ).trigger( "pagehide", previousPage );
    }
    bc.ui.currentPage.addClass( 'page-active' ).removeClass( 'page-transition' );
    $( bc ).trigger( "pageshow", bc.ui.currentPage );
    bc.ui.refreshScrollers();
  }
  
  function changePage( from, to, transitionType ) {
    
    //Hide the overflow to make the transition easier.
    $( from ).addClass( 'page-transition' );
    $( to ).addClass( 'page-transition' );
    
    if( bc.ui.currentPage !== from ) {
      bc.utils.warn('ERROR: trying to transition with a page that is not the currently displayed page.');
    }
    
    switch( transitionType ) {
      case bc.ui.transitions.SLIDE_LEFT:
        from.addClass( 'slide-left-out' )
            .data( 'bc-transition-type', bc.ui.transitions.SLIDE_LEFT );
        break;
      case bc.ui.transitions.SLIDE_RIGHT:
        from.addClass( 'slide-right-out' )
            .data( 'bc-transition-type', bc.ui.transitions.SLIDE_RIGHT );        
        break;
      default:                    
        from.addClass( 'slide-left-out' )
            .data( 'bc-transition-type', bc.ui.transitions.SLIDE_LEFT );        
    }        
  }
  
  function refreshScrollerForPage( $page ) {
     var $scrollers = $page.find( '.scroller' ),
         $scroller;

      if ( $scrollers.length > 0 ) {
        $.each( $scrollers, function( idx, scroller) {
          $scroller = $( scroller );
          if ( $scroller.data( 'bc-scroller' ) ) {
            $scroller.data( 'bc-scroller' ).refresh();
          }
        });
      }

      if ( $page.data( 'bc-scroller' ) ) {
        $page.data( 'bc-scroller' ).refresh();
      }
  }
  
  function freeRAM( $page ) {
    destroyScrollers( $page );
    destroyVideos( $page );
    destroyImages( $page );
  }
  
  //When we remove a page from the DOM, we set the image src to an empty image to release them from RAM.  (just removing the image tag does not release it)
  function destroyImages( $page ) {
    $page.find( 'img' ).each( function() {
      this.src = "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";
    });
  }

  function destroyScrollers( $page ) {
    var $scrollers = $page.find( '.scroller' ),
        aScroller;
    if ( $scrollers.length > 0 ) {
      $.each( $scrollers, function( idx, scroller ) {
        aScroller = $( scroller ).data( 'bc-scroller' );
        if ( aScroller ) {
          aScroller.destroy();
          aScroller = null;
          $( scroller ).data( 'bc-scroller', null );
        }
      });
    }
  }
  
  function destroyVideos( $page ) {
    $page.find( 'video' ).each( function() {
      this.pause();
      $( this ).remove();
    });
  }
  
  function addScroller( scroller ) {
    var $scroller = $( scroller );
    // only add a scroller if there is not already one
    if( typeof( iScroll ) !== "undefined" && $scroller.data( "bc-scroller" ) === undefined ) {
      $scroller.data( "bc-scroller", new iScroll( $scroller.get(0), _iScrollOptions ) );
    }
  }
  
  function registerEventListeners() {
    $( bc ).bind( "vieworientationchange", function( evt, data ) {
      bc.ui.refreshScrollers();
    });
    
    $( bc ).bind( "backbuttonpressed", function( evt ) {
      if( bc.ui.inTransition ) {
        return;
      }
      
      if( bc.ui.pageStack.length > 1 ) {
        bc.ui.backPage();
      } else {
        bc.device.goBack();
      }
    })
  }
  
  function checkForPendingTransitions() {
    var pendingFunction,
        page,
        options;
        
    if( bc.ui.inTransition ) {
      setTimeout( checkForPendingTransitions, 100 );
      return;
    }
    
    pendingFunction = _pendingTransition.pendingFunction;
    page = _pendingTransition.page;
    options = _pendingTransition.options;
    _pendingTransition = undefined;
    if( page !== undefined ) {
      bc.ui[pendingFunction]( page, options );
    } else {
      bc.ui[pendingFunction]( options );
    }
  }
  
})( bc.lib.jQuery );
