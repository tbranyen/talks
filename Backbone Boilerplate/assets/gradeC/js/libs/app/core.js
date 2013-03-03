/*global bc:true atob:false*/
/*jshint indent:2, browser: true, white: false devel:true undef:false*/


/**
 * bc is the namespace for all of the functions and properties available through the Brightcove App Cloud SDK.
 * @namespace
 */
var bc = {};

/**
 * Brightcove core is responsible for communicating with the Brightcove App Cloud server, storing the responses from the server
 * and messaging the appropriate events and data to the components.
 * @namespace
 * @requires jquery-1.5.min.js
 * @requires brightcove.mobile.utils.js  
 */
bc.core = {};

/**
 * Import required 3rd party libraries and namespace so as not to conflict with other versions
 */
bc.lib = {};

// namespace our version of jQuery and reset the global vars of $,jQuery back to what they were
( function() {
  bc.lib.jQuery = jQuery.noConflict(true);    
  if ( jQuery === undefined ) {
    jQuery = bc.lib.jQuery;
    $ = jQuery;    
  }
})();




( function( $, undefined ) {
  //get variables
  var _adsSet,
      _refreshFrequency = 1800000, // milliseconds
      _coreDefaultCtxData = { "trigger":"container" }, //Event fired when the 
      _refreshDefaultCtxData = { "trigger":"refresh" };
    
  /** Timestamp, in milliseconds, of the last time that we successfully fetched data from the server. */
  bc.core.timeOfLastFetchConfigsRequest = undefined; 
  
  /** The URL of the server that will supply the data.  This is the Brightcove URL */
  bc.SERVER_URL = "%SERVER_URL%";
  
  /** The ID of the current application.  This is a unique ID that was assigned at time of application creation inside the Brightcove App Cloud Studio. */
  bc.appID = null;
  
  /** The ID of the current view.  This is a unique ID that was assigned at time of application creation inside the Brightcove App Cloud Studio. */
  bc.viewID = null;
  
  /** The components that are currently instantiated in this view */
  bc.components = {};
  
  /** The SQLite database that we use to track our localStorage usage.  See bc.core.cache and pruneCache to see how this is used. */
  bc.db = null;
  
    /**
   * Context object that exposes information related to the current state of the application.  The following properties exist
   * on the context object:
   * <ul>
   *   <li>viewOrientation: A string that will match either 'portrait' or 'landscape'.  Represents the orientation of the view on the phone.  NOTE:
   *       this is different from device orientation.  For example, the phone might actually be held in landscape mode but the view does not autorotate,
   *       in which case the view would still be in 'portrait' mode.
   * </ul>
   * @namespace
   */
  bc.context = {}; 

  /** 
   * The different types of mode our application can be running in.
   * @namespace
   */
  bc.core.mode = {};

  /** An application is in development mode if it has not been ingested into the Brightcove App Cloud Studio. */
  bc.core.mode.DEVELOPMENT = "development";
  /** An application is in production mode once it has been ingested and published by the Brightcove App Cloud Studio. */
  bc.core.mode.PRODUCTION = "production";
  /** An application is in preview mode if it is either being previewed inside the Brightcove App Cloud Studio or inside the Brightcove extension toolkit.*/
  bc.core.mode.PREVIEW = "preview";
  /** The current mode that our application is running in. */
  bc.core.current_mode = bc.core.mode.DEVELOPMENT;
  
  /**
   * extendClass allows one constructor to inherit from another.  This is used when extending a component.
   * @param subClass The constructor that will inherit public functions and values defined in the parent class.
   * @param superClass The constructor that the subclass will inherit from. 
   * @example 
   //PlaylistComponent now has any functions and properties that Component has.
   bc.core.extendClass( PlaylistComponent, Component );
   */
  bc.core.extendClass = function( subClass, superClass ) {
    var F = function() {};
    F.prototype = superClass.prototype;
    subClass.prototype = new F();
    subClass.prototype.constructor = subClass;

    subClass.superclass = superClass.prototype;
    if( superClass.prototype.constructor == Object.prototype.constructor ) {
      superClass.prototype.constructor = superClass;
    }
  };
  
  /**
   * Depending on whether or not two values are passed into the cache function, it will either read values from or write 
   * values to the localStorage.  Note that there is a limit of 5MB that can be stored in this cache 
   * at any given time.  If this cache fills up then we will remove half the items from the cache.  We use a 
   * LRU (least recently used) cache algorithm to select what should be removed.
   *
   * @param key The key for where the value is stored.
   * @param value The value that should be stored in the localStorage.
   * @return If only a key is passed in then the value is returned or null if no value is found.
   * @example 
   //Note that the cache is persisted across startups.
   bc.core.cache( "whales" ); //returns null because it has never been set.  
   bc.core.cache( "whales", "a pod of whales" );
   bc.core.cache( "whales" ); //returns "a pod of whales"
   */
  bc.core.cache = function( key, value ) {
    try {
      if( value ){
        try {
          window.localStorage.setItem( key, value );
          updateDB( key );
        } catch( e ) {
          bc.utils.warn( "ERROR: we are assuming that our local storage is full and will now remove half of the existing cache:" + e.toString() );
          pruneCache();
        }        
      } else {
        try {
          updateDB( key );
        } catch ( e ) {
          bc.utils.warn( 'ERROR: we were unable to updated the DB with this cache hit' );
        }
        return window.localStorage.getItem( key );
      }
    } catch( e ) {
      bc.utils.warn( "Error storing and/or receiving values in local storage: " + e.toString() );
      return null;
    } 
  };

  /**
   * Retrieves the data from the cache for the component that is passed in.
   * 
   * @param component A Brightcove component, meaning a JavaScript class that extends a Brightcove Component class.
   * @return The data for the component as an object or an empty object if there is either no data or an error occurred.  (Note that errors will be logged to the console)
   * @example 
   // Data is an object
   var data = bc.core.getData( simpleComponent );
   */
  bc.core.getData = function( component ) {
    var cachedData;
    if( component === undefined || component.id === undefined ) {
      bc.utils.warn( "A component was passed into bc.core.getData that was either not defined or did not have an ID.  The component is: " + component );
      return {};
    }
    
    cachedData = bc.core.cache(component.id + '_data');
    if( cachedData !== null ) {
      try {
        return JSON.parse( cachedData );
      } catch( e ) {
        bc.utils.warn( "There was an parsing the JSON string: " + e.toString() + ".  The string is: " + cachedData );
      }
    }
    return {};
  };

  /**
   * Retrieves the styles from the cache for the component that is passed in.
   * 
   * @param component This takes in either the component or the component's ID as a string.
   * @return An object that contains the styles for this particular component.
   * @example 
   // Styles is an object.
   var styles = bc.core.getStyles( simpleComponent );
   */
  bc.core.getStyles = function( component ) {
    if( typeof( component ) === 'string' ) {
      return JSON.parse( bc.core.cache( component + "_styles" ) );
    } else {
      if( component.id  && bc.core.cache( component.id + "_styles" ) ) {
        return JSON.parse( bc.core.cache( component.id + "_styles" ) );
      }
    }

    /**If we have no styles then return the component's defaults.  Can happen on first load of app*/
    return component.getStyleConfig();
  };

  /**
   * Retrieves the settings from the cache for the component that is passed in.
   * 
   * @param component This takes in either the component or the component's ID as a string.
   * @return An object that contains the settings for this particular component.
   * @example 
   // Settings is an object.
   var setting = bc.core.getSettings( simpleComponent );
   */
  bc.core.getSettings = function( component ) {
    if( typeof( component ) === 'string' ) {
      return JSON.parse( bc.core.cache( component + '_setting' ) );
    } else {
      if( component.id && bc.core.cache( component.id + '_setting' ) ) {
        return JSON.parse( bc.core.cache( component.id + '_setting' ));
      }
    }

    return component.getSettingConfig();
  };

  /**
   * Sets a particular style on a component.  For example, if a component exposes a title color, this API can be used to update that particular value.
   *
   * @private   
   * @param componentID The ID of the component as either an integer or a string.
   * @param attribute The attribute that is to be set.  In our example, this would be titleColor
   * @param newValue The new value that of the attribute. For example #ff0000
   * @example

   var bgColor = bc.core.getStyles( '12345' ).background-color; // bgColor is equal to #000000.  (the intial value)
   bc.core.setStyle( '12345', 'background-color', '#ff0000' );
   bgColor = bc.core.getStyles( '12345' ).background-color; // bgColor is equal to #ff0000.
   */
  bc.core.setStyle = function( componentID, attribute, newValue ) {
    try {
      var newStyles = bc.core.getStyles( componentID.toString() );
      newStyles[attribute].value = newValue;
      bc.core.cache( componentID + "_styles", JSON.stringify( newStyles) );
    } catch(e) {
      bc.utils.warn( e.toString() );
    }
  };

  /**
   * Sets a particular setting on a component.  For example, if a component exposes a setting such a player ID, this API can be used to update that particular setting.
   *
   * @private
   * @param componentID The ID of the component.
   * @param attribute The items whose value we want to set.
   * @param newValue The new value that is going to be set.
   */
  bc.core.setSetting = function( componentID, key, newValue ) {
    try {
      var newSettings = bc.core.getSettings( componentID.toString() );
      newSettings[key].value = newValue;
      bc.core.cache( componentID + "_setting", JSON.stringify( newSettings ) );
    } catch( e ) {
      bc.utils.warn( e.toString() );
    }
  };
  
  /**
   * Retrieves content from the server and triggers a bc:new_content event on the element registered with each component if there is new content.
   * If there was an error connecting (bad connection), then a bc:connect_error event is fired on the element.  Finally, if the connection is successful, but
   * there is no new content, then a bc:no_new_content event is fired on the element
   * 
   * @param contextData An optional context object that will be provided in the event that is called once we receive a response from the server.  The name of the property in the event will be contextData.
   * bc:new_content Fired if there is new content available.
   * bc:connect_error Fired if there is an error connecting to the App Cloud server.
   * bc:no_new_content Fired if there is new content available.
   * @example
   // $( ".simple-component-element" ) is the element that is associated with a given component.
   // In other words the HTML element that has the data-bc-component-type="SimpleComponent" on it.
   $( ".simple-component-element" ).bind( "bc:new_content", function( data ) {
     // New content was fetched from the server.  
     var status = data.status; // status is equal "success"
     var context = data.contextData; // context is equal {"trigger":"refresh"}
   });
     
   bc.core.refresh();
   */
  bc.core.refresh = function( contextData ) {
    bc.core.fetchConfigsFromServer( $.extend( _refreshDefaultCtxData, contextData ) );
  };
  
  /**
   * @private
   */
  bc.core.fetchConfigsFromServer = function( contextData ) {
    var url, 
        component;
    if( bc.core.current_mode === bc.core.mode.DEVELOPMENT ) {
      //Make request to the server, but only get the named feed.
      for( var c in bc.components ) {
        component = bc.components[c];
        if( component.namedFeed !== undefined ) {
          //TODO - pull this out into a config?
          url = ( bc.utils.validURL( component.namedFeed) ) ? component.namedFeed : "http://read.appcloud.brightcove.com/named_feeds/" + component.namedFeed + "/fetch";
        
          $.ajax( { url: url,
                    timeout: 30000,
                    dataType: "jsonp",
                    context: component
                  }
                ).success( function( data) {
                    $( this ).trigger( "newcomponentinfo", {
                      "data": data,
                      "styles": {},
                      "settings": {},
                      "contextData": contextData,
                      "status":"success",
                      "newComponentInfo": true
                    });
                  }
                ).error( function( data ) {
                    $( this ).trigger( "newcomponentinfo", {
                      "data": {},
                      "styles": {},
                      "settings": {},
                      "contextData": contextData,
                      "status":"error",
                      "newComponentInfo": true
                    });
                  }
                );
        }
      }
    } else {
      url = bc.SERVER_URL + "/apps/" + bc.appID + "/views/" + bc.viewID + ".json";
      $.ajax( { url: url,  
                timeout: 30000,
                dataType: "jsonp"
              }
            ).success( function( data ) { 
                  bc.core.setConfigsForView( data, contextData ); 
                }
            ).error( function( ) {
                  bc.core.errorFetchingConfigs( contextData );
                }
            );
    }

    bc.core.timeOfLastFetchConfigsRequest = new Date().getTime();
  };

  /**
   * @private
   */
  bc.core.setConfigsForView = function( configs, contextData ) {
    var oldData,
        oldSettings,
        oldStyles,
        newData,
        newSettings,
        newStyles,
        isNewComponentInfo,
        isRefreshTrigger;
        
     /** Data comes back as collection components, where the components store the data, styles and settings for that component */
      try {
        if( typeof( configs ) === "string" ) {
          configs = JSON.parse( configs );
        }
        //store the ad information
        storeAdSettings( configs.ad_mob_code, configs.ad_position );
        
        for( var i = 0, len = configs.components.length; i < len; i++ ) {
          var configurationComponent = configs.components[i];
          var component = bc.components[configurationComponent.id];
          if ( component ) {
            oldStyles = bc.core.cache( component.id + "_styles" );
            oldSettings =  bc.core.cache( component.id + "_setting" );
            oldData =  bc.core.cache( component.id + "_data" );                    

            // write the content into the cache for fast subsequent retrieval
            newStyles = storeStyles( configurationComponent );
            newData = storeData( configurationComponent );
            newSettings = storeSettings( configurationComponent );

            isNewComponentInfo = hasNewComponentInfo( oldData, oldSettings, oldStyles, JSON.stringify( newData ), JSON.stringify( newSettings ), JSON.stringify( newStyles ) );
            isRefreshTrigger = ( contextData && contextData.trigger === "refresh" ) ? true : false;

            if( isRefreshTrigger || isNewComponentInfo ) {
              $( component ).trigger( "newcomponentinfo", {
                "data":newData,
                "styles":newStyles,
                "settings":newSettings,
                "contextData":contextData,
                "newComponentInfo":isNewComponentInfo,
                "status":"success"
              });            
            }
          } else {
            setElementalStyles();
          }
        }
      } catch(e) {
        bc.utils.warn("ERROR: problem setting configs from server " + e.toString());
        //If there is an error we should still trigger the event so that we can read from the cache.
        $( document ).trigger( "newcomponentinfo", [ {"status": "error", "contextData":contextData } ]);
      }
  };
  
  
  /**
   * @private
   */
  bc.core.errorFetchingConfigs = function( contextData ) {
    bc.utils.warn( "ERROR: fetching configs from server" );
    for( var c in bc.components ) {
      $( bc.components[c] ).trigger( "newcomponentinfo", { "status": "error", "contextData":contextData } );
    }
  };

  /**
   * Provides a hook to explicitly set a theme file for this view.  
   *
   * @private
   * @param uri The URI to the theme file that should get cached and injected into the DOM.
   * @example
   bc.core.setTheme( 'http://mobile.brightcove.com/themes/spring/theme.css' ); // Sets this as the active theme.
   */
  bc.core.setTheme = function( uri ) {
    if(uri) {
      bc.core.cache( 'theme' + bc.appID, uri );
      $( "head" ).append( "<link rel='stylesheet' href='" + uri + "' type='text/css' />" );
    } else if( bc.core.cache('theme' + bc.appID) ) {
      $( "head" ).append( "<link rel='stylesheet' href='" + bc.core.cache( 'theme'+ bc.appID ) + "' type='text/css' />" );
    }
  };
  
  /**
   * Checks to see whether or not we are in preview mode. (In the App Cloud Studio).
   *
   * @private
   * @return A boolean indicating whether or not we are in preview mode.    
   */
  bc.core.isPreview = function() {
    return ( window.location !== window.parent.location ) ? true : false;
  };

  /***************************************************************************************
   * Private helper functions
   ***************************************************************************************/
  /**
  * @private
  */
  function hasNewComponentInfo( oldData, oldSettings, oldStyles, newData, newSettings, newStyles ) {
     if ( oldData === newData && oldSettings === newSettings && oldStyles === newStyles ) {
       return false;
     } else {
       return true;
     }
   }
  
  /** For elements that are not part of the DOM we can set their inline CSS immediately */
  function setElementalStyles() {
    $( "*[data-bc-configurable-styles]" ).each( function() {
      var cachedStyles = bc.core.cache( $(this).attr( "data-bc-component-id" ) + "_styles" );
      if( cachedStyles !== null ) {
        var styles = JSON.parse( cachedStyles );
        for(var i in styles) {
          if( styles[i].value && styles[i].value.toString() !== "" ) {
            if (i === "src") {
              $( this ).attr( i, styles[i].value.toString() );
            } else {
              $( this ).css( i, styles[i].value.toString() );
            }
          }
        }
      }
    });
  }
  
  function storeData( component  ) {
    if( component === undefined || component.id === undefined || component.get_data === undefined ) {
      return;
    }
    var data = component.get_data,
        cachedData = bc.core.cache( component.id + "_data" );
        
    if( data && cachedData !== JSON.stringify( data ) ) {
      bc.core.cache( component.id + "_data", JSON.stringify( data ) );
    }
    
    return data;
  }

  function storeSettings( component ) {
    var settings;
    if( component === undefined || component.id === undefined || component.settings === undefined ) {
      return true;
    }
    
    settings = {};
    for( var i = 0, len = component.settings.length; i < len; i++ ) {
      settings[component.settings[i].name] = { input_type: component.settings[i].input_type, value: component.settings[i].value };
    }
    bc.core.cache( component.id + "_setting", JSON.stringify( settings ) );   
    return settings; 
  }

  function storeStyles(component) {
    if( component === undefined || component.id === undefined || component.configurations === undefined ) {
      return true;
    }
    
    var styles = {};
    for( var i = 0, len = component.configurations.length; i < len; i++ ) {
      styles[component.configurations[i].name] = { type: component.configurations[i].configuration_type, value: component.configurations[i].value };
    }
    
    bc.core.cache( component.id + "_styles", JSON.stringify( styles ) );    
    return styles;
  }
  
  function storeAdSettings( ad_code, ad_position ) {
    if(ad_code && ad_position && ad_position !== "none" ) {
      //TODO - we are hardcoding ad_network to admob.  Check to see if this is returned from the server.
      bc.core.cache( bc.viewID + "_ad_settings", JSON.stringify( {'should_show_ad': 'true', 'ad_code': ad_code, 'ad_position': ad_position, 'ad_network': 'admob' } ));
    } else {
      bc.core.cache( bc.viewID + "_ad_settings", JSON.stringify( {'should_show_ad': 'false' } ));
    }
    //TODO - I should pass this to adPolicy instead of reading from the cache again.
    setAdPolicy();
  }

  function setGlobalIDValues() {
    bc.viewID = $( "body" ).data( "bc-view-id" );
    bc.appID = $( "body" ).data( "bc-app-id" );
    
    if( bc.appID !== undefined) {
      if( bc.core.isPreview() ) {
        bc.core.current_mode = bc.core.mode.PREVIEW;
      } else {
        bc.core.current_mode = bc.core.mode.PRODUCTION;
      }
    }
    bcAppDB();
  }

  function bcAppDB() {
    if( typeof( window.openDatabase ) !== "function") {
      return null;
    }
    
    try {
      bc.db = window.openDatabase(bc.appID, "1.0", "BC_" + bc.appID, 1024*1024);  
      createTables();
    } catch(e) {
      bc.utils.warn("THERE WAS AN ERROR OPENING THE DB");
      bc.db = null;
    }
  }
  
  function createTables() {
    if( !bc.db ) {
      return;
    }
      
    bc.db.transaction(  
      function (transaction) {  
        transaction.executeSql( "CREATE TABLE IF NOT EXISTS components(id INTEGER NOT NULL PRIMARY KEY, component_id TEXT NOT NULL, modified TIMESTAMP NOT NULL);" );         
      }  
    );  
  }
  
  function pruneCache() {
    //remove have the cache in a worker thread.
    if( bc.db !== null ) {
      var ids_to_remove = "";
      bc.db.transaction(  
        function (transaction) {  
          transaction.executeSql( "SELECT component_id from components ORDER BY modified;", [], function( tx, results ) {
            //TODO - do we want a more robust decision maker for, perhaps sorting by payload?
            for ( var i = 0, len = results.rows.length; i < len/2; i++ ) {
              var item = results.rows.item( i ).component_id;
              window.localStorage.removeItem( item );
              ids_to_remove += "component_id = '" + item + "' OR ";
            }
            
            //Once we have cleaned up the local storage we should now clean up the DB.
            ids_to_remove = ids_to_remove.substring( 0, ( ids_to_remove.length - 4 ) );
            bc.db.transaction(
              function (transaction) { 
                transaction.executeSql( "DELETE FROM components WHERE " + ids_to_remove + ";", [] );          
              }
            );
          });         
        }  
      );
    }else {
      //If there is no DB then we do not have a more intelligent way to prune other then to remove 
      window.localStorage.clear();
    }
  }
  
  function updateDB(component_id) {
    if(bc.db === null) {
      return;
    }
    
    bc.db.transaction(  
      function (transaction) {
        transaction.executeSql( "SELECT component_id FROM components WHERE component_id ='" + component_id +"';", [], function( tx, results ) {
          if(results.rows.length === 0) {
            bc.db.transaction(  
              function ( transaction ) {  
                transaction.executeSql( "INSERT INTO components (component_id, modified) VALUES ('" + component_id + "', '" + Date() + "');" );         
              }  
            );
          } else {
            bc.db.transaction(
              function ( transaction ) { 
                transaction.executeSql( "UPDATE components SET modified = '" + Date() + "' WHERE component_id ='" + component_id + "';" );          
              }
            );
            
          }
        });                  
      }  
    );
  }
  
  function setAdPolicy() {
    //If we have already set an ad policy we do not want to do again.
    if ( _adsSet !== undefined ) {
      return;
    }
      
    var ad_settings = bc.core.cache( bc.viewID + "_ad_settings");
    if( ad_settings && bc.device !== undefined && bc.device.setAdPolicy !== undefined ) {
      bc.device.setAdPolicy( JSON.parse( ad_settings ) );
      _adsSet = true;
    }
  }

/**
 * Public Events
 */
/**
 * The vieworientationchange event is fired anytime that the view itself rotates on the device.  The
 * event will contain three properties: orientation, width, and height. The orientation corresponds to [ landscape | portrait ]
 * and the width and height are the dimensions of the view in the new orientation.  This event is fired on the bc
 * object.
 *
 * @example
 * $( bc ).bind( "vieworientationchange", function( evt, rslt ) {
 *   alert("I'm " + rslt.orientation); 
 * });
 *
 * @name vieworientationchange
 * @event
 * @memberOf bc
 * @param event (type of vieworientationchange)
 * @param result object contains three properties; orientation, width, and height.  The
 * orientation will be the new orientation of the view ['portrait' | 'landscape'].  The width and
 * height will be the width and height of the view (window) in pixels.
 */
  $( window ).bind( "resize", function( evt, result ) {
    var newWidth = window.innerWidth,
        newHeight = window.innerHeight,
        orientation = ( newWidth > newHeight ) ? "landscape" : "portrait";

    if ( orientation !== bc.context.viewOrientation ) {
      bc.context.viewOrientation = orientation;
      $( bc ).trigger( "vieworientationchange", {
        "orientation": orientation,
        "width": newWidth,
        "height": newHeight
      });
    }
  });


  /**
   * The init function is triggered at the end of the initialization process.  At this point the bc.context object has been initialized,
   * all components have been initialized and application logic can begin executing.
   * 
   * @example
   * $( bc ).bind( "init", function(evt) {
   *    alert("BC SDK is initialized.  Can access bc.context such as: "  + bc.context.vieworientation);
   * });
   * @name init
   * @event
   * @memberOf bc
   * @param event (type of init)
   */
  function triggerInitEvent() {
    $( bc ).trigger( "init" );  
  }

  /**
   * End Events
   */

  $( bc ).bind( "sessionstart", function() {
    // initalize the event tracker
    if( bc.metrics ) {
      var pendingMetrics = bc.core.cache( "pending_metrics" );
      if( pendingMetrics ) {
        pendingMetrics = JSON.parse( pendingMetrics );
      }
      bc.metrics.init({
        domain:'katama',
        // TODO: account:0, /* TODO: need account id for the app */
        pendingMetrics: pendingMetrics
        /*TODO: options like url and stuff*/
      }, { 
        /* global session metadata */
        application:bc.appId,
        view:bc.viewId //,
        // TODO: session:sessionId,
        // TODO: user:userId
      });
      bc.metrics.track( "session" );
    }
  });
  
  $( bc ).bind( "sessionend", function() {
    if( bc.metrics ) {
      bc.core.cache( "pending_metrics", JSON.stringify( bc.metrics.unload() ) );
    }
  });
  
  $( bc ).bind( "install", function() {
    if( bc.metrics ) {
      bc.metrics.track( "install" );
    }
  });
  
  /*
   * Compares the current time against the last time we fetched data to see if we should request new data
   */ 
  function shouldRequestDataFromServer() {
    if( bc.core.timeOfLastFetchConfigsRequest === undefined ) {
      return;
    }
    
    if( ( new Date().getTime() - bc.core.timeOfLastFetchConfigsRequest ) > _refreshFrequency ) {
      bc.core.fetchConfigsFromServer( _coreDefaultCtxData );
    }
  }

  /*
   * Finds any components on the current page and instantiates the components.
   */
  function instantiateComponents() {
    $( "[data-bc-component-type]" ).each( function() {
      var $this = $( this ),
          type = $this.data( "bc-component-type" );

      //every function actually exists on the window object.
      if( window[type] !== undefined ) {
        new window[type]( $this );
      } else {
        bc.utils.warn( "There is no component type of: " + type + " found on this page");
      }
    });
  }

  /**
   * Set up our context object with any values that can be bootstrapped.
   */
  function initContextObject() {
    bc.context.viewOrientation = ( window.innerWidth > window.innerHeight ) ? "landscape" : "portrait";
  }

  $( document ).ready( function() {
    initContextObject();          
    instantiateComponents();
    bc.core.setTheme();
    setGlobalIDValues();
    setElementalStyles();
    setAdPolicy();    
    triggerInitEvent();    
  });
  
  //TODO - Check to see if we still need this.
  $( window ).load( function() {
    setTimeout( function() {
      bc.core.fetchConfigsFromServer( _coreDefaultCtxData );
    }, 100 );
     
    //Start interval to see if we should fetch new configs.
    setInterval( shouldRequestDataFromServer, 10000 );
  });
} )( bc.lib.jQuery );
