/*global bc:true atob:false jQuery:false*/
/*jshint indent:2, browser: true, white: false devel:true*/
 
 /**
* Brightcove App Cloud events that are added to the jQuery object.  This enables you to
* use the jQuery event attachment functions (live, delegate, bind) with these set of events.
* These events will work across both desktops and mobile devices.
*
* @namespace
* @name Events
* @requires jquery-1.5.min.js
* @requires brightcove.mobile.core.js
* @requires brightcove.mobile.utils.js 
*/
bc.events = {};

( function( $, undefined ) {
  var MOVE_THRESHOLD = 10;
  var supportsTouch;
  
  if( bc.utils.hasTouchSupport() ) {
    bc.events.start = "touchstart";
    bc.events.move = "touchmove";
    bc.events.end = "touchend";
    bc.events.cancel = "touchcancel";
  } else {
    bc.events.start = "mousedown";
    bc.events.move = "mousemove";
    bc.events.end = "mouseup";
    bc.events.cancel = "touchcancel";
  }  
    
  /**
   * @event
   * @memberOf Events
   * @name tap
   *
   * @description Tap is an event that represents a user 'tapping' on an element.  It is recommended to use tap rather than click
   * as it eliminates 300ms of delay that binding to a 'click' event introduces on some platforms.  When running on non-touch 
   * devices, the tap event  will be equivalent to 'click'.  This means binding to tap will work across both 
   * touch and non-touch devices.
   *
   * @example $( '.cancel-button' ).bind( 'tap', function() {
      alert('Are you sure you want to cancel form submission?');
   });
   */
  $.event.special.tap = {
    setup: function( data ) {
      var $this = $( this );
      
      $this.bind( bc.events.start, function( event ) {
        var moved = false,
          touching = true,
          origTarget = event.target,
          origEvent = event.originalEvent,
          origPos = event.type == "touchstart" ? [origEvent.touches[0].pageX, origEvent.touches[0].pageY] : [ event.pageX, event.pageY ],
          originalType,
          tapHoldTimer;
                    
        //We want to protect against them tapping and holding.  So we start a timer to see if they haven't moved or released.
        tapHoldTimer = setTimeout( function() {
          $this.unbind( bc.events.end ).unbind( bc.events.move );
        }, 750);
          
        //Register the move event listener so we know if this is not actually a tap but a swipe or scroll
        $this.bind( bc.events.move, function( event ) {
          var newPageXY = event.type == "touchmove" ? event.originalEvent.touches[0] : event;
          if ( ( Math.abs( origPos[0] - newPageXY.pageX ) > MOVE_THRESHOLD ) || ( Math.abs( origPos[1] - newPageXY.pageY ) > MOVE_THRESHOLD ) ) {
            moved = true;
          }
        });
        
        //Register the end event so we can check to see if we should fire a tap event and cleanup.
        $this.one( bc.events.end, function( event ) {
          $this.unbind( bc.events.move );
          clearTimeout( tapHoldTimer );
          touching = false;
          
          /* ONLY trigger a 'tap' event if the start target is
           * the same as the stop target.
           */
          if ( !moved && ( origTarget === event.target ) ) {
              originalType = event.type;
              event.type = "tap";
              $.event.handle.call( $this[0], event );
              event.type = originalType;
          }
        });
      });
    }
  };
  
  /**
   * @event
   * @memberOf Events
   * @name swipe
   *
   * @description On touch platforms, users can provide input with a 'swipe' gesture.  For example, a user placing their finger on the screen
   * and dragging it.  When the swipe event is fired, the type of event will be 'swipe'.  An additional parameter will be passed to 
   * any bound functions which is either 'swipeRight' or 'swipeLeft'.  This additional parameter can be used to understand in which 
   * direction the user is swiping.
   *
   * @example  $('.image').bind( 'swipe', function(evt, direction) {
       if( direction === 'swipeRight' ) {
         handleSwipeRight( this );
       } else {
         handleSwipeLeft( this );
       }
    });
   *
   */  
 $.event.special.swipe = {
    setup: function( data ) {
      var $this = $( this );
      
      $this.bind( bc.events.start, function( event ) {
        var moved = false,
          touching = true,
          origTarget = event.target,
          origEvent = event.originalEvent,
          origPos = event.type == "touchstart" ? [origEvent.touches[0].pageX, origEvent.touches[0].pageY] : [ event.pageX, event.pageY ],
          originalType,
          tapHoldTimer,
          $elem = $( event.target );
          
        //We want to protect against them tapping and holding.  So we start a timer to see if they haven't moved or released.
        tapHoldTimer = setTimeout( function() {
          $this.unbind( bc.events.end ).unbind( bc.events.move );
        }, 750);
          
        //Register the move event listener so we know if this is not actually a tap but a swipe or scroll
        $this.bind( bc.events.move, function( event ) {
          var newPageXY = event.type == "touchmove" ? event.originalEvent.touches[0] : event;
          if ( (Math.abs(origPos[0] - newPageXY.pageX) > MOVE_THRESHOLD) ) {
             $this.unbind( bc.events.move );
             clearTimeout( tapHoldTimer );
             $elem.trigger( 'swipe', ( origPos[0] > newPageXY.pageX ) ? 'swipeLeft' : 'swipeRight' );
          }
        });
        
        //Register the end event so we can check to see if we should fire a tap event and cleanup.
        $this.one( bc.events.end, function( event ) {
          $this.unbind( bc.events.move );
          clearTimeout( tapHoldTimer );
          touching = false;
        });
        
      });
    }
  };

})( bc.lib.jQuery );