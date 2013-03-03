/**
* Brightcove Metrics provides functions to measure interactions with applications.
*/
bc.metrics = {};

(function( window, document, bc, undefined ) {

  var _settings = undefined,
      _transit = undefined,
      _poll_interval = undefined,
      _loader = undefined,
      _pending = [],
      _lives = [],
      _errors = 0
      
  
  /*
   * Crypto-JS v2.0.0
   * http://code.google.com/p/crypto-js/
   * Copyright (c ) 2009, Jeff Mott. All rights reserved.
   * http://code.google.com/p/crypto-js/wiki/License
   */
  var Crypto = {};
  // sha1
  (function(){var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";var d=Crypto={};var a=d.util={rotl:function( h,g ){return( h<<g )|(h>>>(32-g ) )},rotr:function( h,g ){return( h<<(32-g ) )|(h>>>g )},endian:function( h ){if( h.constructor==Number ){return a.rotl( h,8 )&16711935|a.rotl( h,24 )&4278255360}for( var g=0;g<h.length;g++ ){h[g]=a.endian( h[g] )}return h},randomBytes:function( h ){for( var g=[];h>0;h-- ){g.push( Math.floor( Math.random()*256 ) )}return g},bytesToWords:function( h ){for( var k=[],j=0,g=0;j<h.length;j++,g+=8 ){k[g>>>5]|=h[j]<<(24-g%32 )}return k},wordsToBytes:function( i ){for( var h=[],g=0;g<i.length*32;g+=8 ){h.push((i[g>>>5]>>>(24-g%32 ) )&255 )}return h},bytesToHex:function( g ){for( var j=[],h=0;h<g.length;h++ ){j.push((g[h]>>>4 ).toString( 16 ) );j.push((g[h]&15 ).toString( 16 ) )}return j.join( "" )},hexToBytes:function( h ){for( var g=[],i=0;i<h.length;i+=2 ){g.push( parseInt( h.substr( i,2 ),16 ) )}return g},bytesToBase64:function( h ){if( typeof btoa=="function" ){return btoa( e.bytesToString( h ) )}for( var g=[],l=0;l<h.length;l+=3 ){var m=(h[l]<<16 )|(h[l+1]<<8 )|h[l+2];for( var k=0;k<4;k++ ){if( l*8+k*6<=h.length*8 ){g.push( c.charAt((m>>>6*(3-k ) )&63 ) )}else{g.push( "=" )}}}return g.join( "" )},base64ToBytes:function( h ){if( typeof atob=="function" ){return e.stringToBytes( atob( h ) )}h=h.replace( /[^A-Z0-9+\/]/ig,"" );for( var g=[],j=0,k=0;j<h.length;k=++j%4 ){if( k==0 ){continue}g.push(((c.indexOf( h.charAt( j-1 ) )&(Math.pow( 2,-2*k+8 )-1 ) )<<(k*2 ) )|(c.indexOf( h.charAt( j ) )>>>(6-k*2 ) ) )}return g}};d.mode={};var b=d.charenc={};var f=b.UTF8={stringToBytes:function( g ){return e.stringToBytes( unescape( encodeURIComponent( g ) ) )},bytesToString:function( g ){return decodeURIComponent( escape( e.bytesToString( g ) ) )}};var e=b.Binary={stringToBytes:function( j ){for( var g=[],h=0;h<j.length;h++ ){g.push( j.charCodeAt( h ) )}return g},bytesToString:function( g ){for( var j=[],h=0;h<g.length;h++ ){j.push( String.fromCharCode( g[h] ) )}return j.join( "" )}}})();(function(){var f=Crypto,a=f.util,b=f.charenc,e=b.UTF8,d=b.Binary;var c=f.SHA1=function( i,g ){var h=a.wordsToBytes( c._sha1(i ) );return g&&g.asBytes?h:g&&g.asString?d.bytesToString( h ):a.bytesToHex( h )};c._sha1=function( o ){if( o.constructor==String ){o=e.stringToBytes( o )}var v=a.bytesToWords( o ),x=o.length*8,p=[],r=1732584193,q=-271733879,k=-1732584194,h=271733878,g=-1009589776;v[x>>5]|=128<<(24-x%32 );v[((x+64>>>9 )<<4 )+15]=x;for( var z=0;z<v.length;z+=16 ){var E=r,D=q,C=k,B=h,A=g;for( var y=0;y<80;y++ ){if( y<16 ){p[y]=v[z+y]}else{var u=p[y-3]^p[y-8]^p[y-14]^p[y-16];p[y]=(u<<1 )|(u>>>31 )}var s=((r<<5 )|(r>>>27 ) )+g+(p[y]>>>0 )+(y<20?(q&k|~q&h )+1518500249:y<40?(q^k^h )+1859775393:y<60?(q&k|q&h|k&h )-1894007588:(q^k^h )-899497514 );g=h;h=k;k=(q<<30 )|(q>>>2 );q=r;r=s}r+=E;q+=D;k+=C;h+=B;g+=A}return[r,q,k,h,g]};c._blocksize=16})();
  // hmac
  (function(){var e=Crypto,a=e.util,b=e.charenc,d=b.UTF8,c=b.Binary;e.HMAC=function( l,m,k,h ){if( m.constructor==String ){m=d.stringToBytes( m )}if( k.constructor==String ){k=d.stringToBytes( k )}if( k.length>l._blocksize*4 ){k=l( k,{asBytes:true})}var g=k.slice( 0 ),n=k.slice( 0 );for( var j=0;j<l._blocksize*4;j++ ){g[j]^=92;n[j]^=54}var f=l( g.concat( l( n.concat( m ),{asBytes:true}) ),{asBytes:true});return h&&h.asBytes?f:h&&h.asString?c.bytesToString( f ):a.bytesToHex( f )}})();

  function getEvent( event, eventData ) {
    return $.extend({
      event: event, 
      time:(new Date() ).getTime()
    }, eventData );
  }

  function flush( force ) {
    if( bc.metrics.isInitialized() ) {
      if( force || _settings.interval <= 0 ) {
        trackLive();
        send();
      } else if( _poll_interval === undefined ) {
        _poll_interval = setInterval( function() {
          trackLive();
          send();
        }, _settings.interval );
      }
    }
  }
  
  function trackLive() {
    for( var i=0; i < _lives.length; i++ ) {
      if( _lives[i] ) {
        var ev = getEvent( _lives[i].event, _lives[i].properties );
        ev.units = ev.time - _lives[i].last;
        _lives[i].last = ev.time;
        _pending.push( ev );
      }
    }
  }

  function send() {
    var url, signature;
     
    if( !bc.metrics.isInitialized() || _transit !== undefined || _pending.length === 0 ){
      // not ready, event already in _transit or nothing to send
      return;
    }
    while( !_transit ) {
      if( _pending.length == 0 ) {
        // _pending events were all null
        return;
      }
      _transit = _pending.shift();
    }
    
    _transit = $.extend( _transit, _settings.data );
    url = _settings["uri"] + "?" + $.param( _transit );
    signature = sign( _settings["token"], url );
    url += "&" + "sig=" + signature;
    _loader.attr( "src",url );
  }

  function sign( key, str ) {
    return Crypto.util.bytesToBase64(Crypto.HMAC( Crypto.SHA1, str, key, {asBytes:true}) );
  }
  
  function bind_loader() {
    _loader.bind( "load", function() {
      _errors = 0;
      _transit=undefined;
      send();
    });
    
    _loader.bind( "error", function() {
      bc.utils.warn( "ERROR: unable to send metrics to", _settings.uri );
      setTimeout( function(){
        if( _transit !== undefined ) {
          _pending.push( _transit );
          _transit=undefined;
        }
        send();
      }, _settings.interval * Math.log( ++_errors ) );
    });
  }
  
  /*
   * Initialize and bind the metrics runtime
   * 
   * @param options - an object containing the metrics options
   *    - uri - the url used to send metric events
   *    - interval - the millisecond interval between event polling 
   *        (zero or negative will cause all tracking events to fire immediately, 
   *        but will also mean that live tracking must be explicitly dispatched )
   *    - token - the secret key used to authenticate and sign requests
   * @param data - session wide metadata that will be included with each event
   */
  bc.metrics.init = function( options, data ) {
    $( function(){
      _settings = $.extend({}, bc.metrics.defaults, options );
      _settings.data = data || {};
      _settings.data.domain = _settings.domain;
      if( _settings.pendingMetrics ) {
        _pending = _pending.concat( _settings.pendingMetrics );
      }
      _loader = _settings.loader || $( "<img />" ).appendTo( $( "head" ) );
      bind_loader();
      flush();
    });
  }
  
  /*
   * Unloads the metrics context and returns any undelivered events
   */
  bc.metrics.unload = function() {
    var result;
    
    if( _poll_interval !== undefined ){
      clearInterval( _poll_interval );
      _poll_interval = undefined;
    }
    for( var i=0; i < _lives.length; i++ ) {
      _lives[i].die();
    }
    _lives = [];
    if( _loader !== undefined ) {
      _loader.unbind();
      _loader = undefined;
    }
    if( _transit !== undefined ) {
      _pending.push( _transit );
      _transit = undefined;
    }
    _settings = undefined;
    result = _pending;
    _pending = [];
    return result;
  }

  /*
   * Send a tacking event
   *
   * @param event - the name of the event
   * @param properties - metadata specific to this event
   */
  bc.metrics.track = function( event, properties ) {
    _pending.push( getEvent( event, properties ) );
    flush();
  }

  /*
   * Create a live tracking event which sends time delta information for each poll interval.
   *
   * @param event - the name of the event
   * @param properties - metadata specific to this event
   * @returnValue - a closure which can be used to cancel the tracking and flush the last time delta
   */
  bc.metrics.live = function( event, properties ) {
    var liver = _lives.length,
        ev,
        die;
    
    for( var i=0; i < _lives.length; i++ ) {
      if( !_lives[i] ) {
        liver=i;
      }
    }
    die = function(){
      ev = getEvent( _lives[liver].event, _lives[liver].properties );
      ev.units = ev.time - _lives[liver].last;
      _pending.push( ev );
      flush( true );
      _lives[liver] = null;
    }
    _lives[liver] = {
      event:event,
      properties:properties,
      last:(new Date() ).getTime(),
      die:die
    }
    return die; 
  }
  
  bc.metrics.isInitialized = function() {
    return _settings !== undefined;
  }
  
  bc.metrics.defaults =  {
    kid:0, // the id of the secret key
    token:"secret_key", // the secret call signing key
    uri:"http://localhost:44080/tracker", // the url of the event tracking service
    interval:5000 // the default poll interval
  };

})( window, document, bc );