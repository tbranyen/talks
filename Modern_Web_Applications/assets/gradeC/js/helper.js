/*
 * MBP - Mobile boilerplate helper functions
 */
(function(document){

window.MBP = window.MBP || {}; 

// Fix for iPhone viewport scale bug 
// http://www.blog.highub.com/mobile-2/a-fix-for-iphone-viewport-scale-bug/

MBP.viewportmeta = document.querySelector && document.querySelector('meta[name="viewport"]');
MBP.ua = navigator.userAgent;

MBP.scaleFix = function () {
  if (MBP.viewportmeta && /iPhone|iPad/.test(MBP.ua) && !/Opera Mini/.test(MBP.ua)) {
    MBP.viewportmeta.content = "width=device-width, minimum-scale=1.0, maximum-scale=1.0";
    document.addEventListener("gesturestart", MBP.gestureStart, false);
  }
};
MBP.gestureStart = function () {
    MBP.viewportmeta.content = "width=device-width, minimum-scale=0.25, maximum-scale=1.6";
};


// Hide URL Bar for iOS
// http://remysharp.com/2010/08/05/doing-it-right-skipping-the-iphone-url-bar/

MBP.hideUrlBar = function () {
    /iPhone/.test(MBP.ua) && !pageYOffset && !location.hash && setTimeout(function () {
      window.scrollTo(0, 1);
    }, 1000);
};


// Fast Buttons - read wiki below before using
// https://github.com/shichuan/mobile-html5-boilerplate/wiki/JavaScript-Helper

MBP.fastButton = function (element, handler) {
    this.element = element;
    this.handler = handler;
    if (element.addEventListener) {
      element.addEventListener('touchstart', this, false);
      element.addEventListener('click', this, false);
    }
};

MBP.fastButton.prototype.handleEvent = function(event) {
    switch (event.type) {
        case 'touchstart': this.onTouchStart(event); break;
        case 'touchmove': this.onTouchMove(event); break;
        case 'touchend': this.onClick(event); break;
        case 'click': this.onClick(event); break;
    }
};

MBP.fastButton.prototype.onTouchStart = function(event) {
    event.stopPropagation();
    this.element.addEventListener('touchend', this, false);
    document.body.addEventListener('touchmove', this, false);
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    this.element.style.backgroundColor = "rgba(0,0,0,.7)";
};

MBP.fastButton.prototype.onTouchMove = function(event) {
    if(Math.abs(event.touches[0].clientX - this.startX) > 10 || Math.abs(event.touches[0].clientY - this.startY) > 10) {
        this.reset();
    }
};

MBP.fastButton.prototype.onClick = function(event) {
    event.stopPropagation();
    this.reset();
    this.handler(event);
    if(event.type == 'touchend') {
        MBP.preventGhostClick(this.startX, this.startY);
    }
    this.element.style.backgroundColor = "";
};

MBP.fastButton.prototype.reset = function() {
    this.element.removeEventListener('touchend', this, false);
    document.body.removeEventListener('touchmove', this, false);
    this.element.style.backgroundColor = "";
};

MBP.preventGhostClick = function (x, y) {
    MBP.coords.push(x, y);
    window.setTimeout(function (){
        MBP.coords.splice(0, 2);
    }, 2500);
};

MBP.ghostClickHandler = function (event) {
    for(var i = 0, len = MBP.coords.length; i < len; i += 2) {
        var x = MBP.coords[i];
        var y = MBP.coords[i + 1];
        if(Math.abs(event.clientX - x) < 25 && Math.abs(event.clientY - y) < 25) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
};

if (document.addEventListener) {
    document.addEventListener('click', MBP.ghostClickHandler, true);
}
                            
MBP.coords = [];


// iOS Startup Image
// https://github.com/shichuan/mobile-html5-boilerplate/issues#issue/2

MBP.splash = function () {
    var filename = navigator.platform === 'iPad' ? 'h/' : 'l/';
    document.write('<link rel="apple-touch-startup-image" href="/img/' + filename + 'splash.png" />' );
};


// Autogrow
// http://googlecode.blogspot.com/2009/07/gmail-for-mobile-html5-series.html

MBP.autogrow = function (element, lh) {

    function handler(e){
        var newHeight = this.scrollHeight,
            currentHeight = this.clientHeight;
        if (newHeight > currentHeight) {
            this.style.height = newHeight + 3 * textLineHeight + "px";
        }
    }

    var setLineHeight = (lh) ? lh : 12,
        textLineHeight = element.currentStyle ? element.currentStyle.lineHeight : 
                         getComputedStyle(element, null).lineHeight;

    textLineHeight = (textLineHeight.indexOf("px") == -1) ? setLineHeight :
                     parseInt(textLineHeight, 10);

    element.style.overflow = "hidden";
    element.addEventListener ? element.addEventListener('keyup', handler, false) :
                               element.attachEvent('onkeyup', handler);
};

})(document);


// Function.prototype.bind polyfill
if ( !Function.prototype.bind ) {
  Function.prototype.bind = function( obj ) {
    if(typeof this !== 'function') // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');

    var slice = [].slice,
        args = slice.call(arguments, 1), 
        self = this, 
        nop = function () {}, 
        bound = function () {
          return self.apply( this instanceof nop ? this : ( obj || {} ), 
                              args.concat( slice.call(arguments) ) );    
        };

    bound.prototype = this.prototype;

    return bound;
  };
}


// Inspired by: http://bit.ly/juSAWl
// Augment String.prototype to allow for easier formatting.  This implementation 
// doesn't completely destroy any existing String.prototype.format functions,
// and will stringify objects/arrays.
String.prototype.format = function(i, safe, arg) {

  function format() {
    var str = this, len = arguments.length;

    // For each {0} {1} {n...} replace with the argument in that position.  If 
    // the argument is an object or an array it will be stringified to JSON.
    for (i=0; i < len+1; arg = arguments[i++]) {
      safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
      str = str.replace(RegExp('\\{'+(i-1)+'\\}', 'g'), safe);
    }
    return str;
  }

  // Save a reference of what may already exist under the property native.  
  // Allows for doing something like: if("".format.native) { /* use native */ }
  format.native = String.prototype.format;

  // Replace the prototype property
  return format;

}();

// Source: http://bit.ly/fmd3no
// Fix negative modulo issues.
Number.prototype.mod = function( n ) {
  return ((this % n) + n) % n;
};

(function() {
  function store( key, val ) {
    if( typeof val === 'undefined' ) {
      val = this.getItem( key );

      try {
        return JSON.parse( val );
      } catch( ex ) {
        return val;
      }
    }

    if( typeof val === 'object' ) {
      val = JSON.stringify( val );
    }
    this.setItem( key, val );
  }

  bc.core.session = function() {
    return store.bind( window.sessionStorage );
  }();

  bc.core.cache = function() {
    return store.bind( window.localStorage );
  }();
  
  Component.prototype.parent = function() {
    var args = Array.prototype.slice.call( arguments );
    this.superclass.constructor.apply( args.shift(), args.concat(this.name) );
  };

  Component.prototype.fetchTemplate = function() {
    var cache = {};

    return function( name, cb ) {
      if( cache[name] ) {
        cb( cache[name] );
      }
      else {
        $.get( [ '../templates/', name, '.html' ].join(''), function( html ) {
          cache[name] = html;
          cb && cb( html );
        });
      }
    };
  }();

  Component.prototype.setView = function( view ) {
    this.view = view;
  };

  Component.prototype.wrapPage = function( id, html ) {
    var page = $( '<div class="page">' );
    page.html( html ).attr( 'id', id );

    return page;
  };

  Component.prototype.wrapData = function( obj, obj2 ) {
    if( obj2 ) { $.extend(obj, obj2); }

    var location = bc.core.cache( 'location' );
    var weather = bc.core.cache( 'weather' );

    if( location ) {
      obj.edition = location.name;
    }

    if ( weather && weather.current ) {
      obj.weather_icon = weather.forecast[0].thumbnail;
      obj.temp = weather.current.temp;
    }

    return obj;
  };

  Component.prototype.reset = function() {
    var that = this;
    console.log('here');

    that.element.html( that.originalHTML );
  };

  Component.prototype.render = function() {
    var that = this;
    var current = that.views[ that.view ];

    that.fetchTemplate( current.template, function( html ) {
      current.render.call( that, html );
      
      window.setTimeout(function() {
        bc.ui.refreshScrollers();
        that.applyStyles();
      }, 100);
    });
  };

  // pulled from playlist component
  Component.prototype.brightcovePlayerCompatible = function() {
    var ua = navigator.userAgent.indexOf;
    return !!( ~ua( 'iPhone OS 3') || !~ua('iPhone OS 4_0') || ~ua('iPhone OS 4_1') );
  };

  Component.prototype.loadBrightcoveExperienceFile = function() {
    $.getScript( 'http://admin.brightcove.com/js/BrightcoveExperiences.js' );
  };

  Component.prototype.normalizePhotos = function( data ) {
    var filter = /media_content\_(\w+)_(\d+)/;
    var captures;

    $.each( data, function( idx ) {
      var obj = data[idx];
      var media_content = [];

      $.each( obj, function( key, val ) {
        var title;
        var idx;

        captures = filter.exec( key );
        if( captures ) {
          title = captures[1];
          idx = +captures[2];

          if( val ) {
            media_content[idx-1] = media_content[idx-1] || {};
            media_content[idx-1][title] = val;
          }

          delete obj[key];
        } 
      });

      obj.media_content = media_content;
    });

    return data;
  };

})();

// Done dealing with these
console.warn = function(){};
