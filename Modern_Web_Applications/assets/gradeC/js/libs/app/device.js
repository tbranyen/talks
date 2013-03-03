/*global bc:true atob:false*/
/*jshint indent:2, browser: true, white: false devel:true undef:false*/

/**
 * Brightcove device provides functions to interact with the native capabilities of a device.
 *
 * <b>Note:</b>All functions take in an optional success and error handler. 
 * 
 * @namespace
 * @requires jquery-1.5.min.js  
 * @requires core.js
 * @requires utils.js 
 */
bc.device = {};

( function( $ ) {
 
 /*****************************************
  * Universal callback methodology
  ****************************************/
  var _callbackFunctionMap = {},
      _callStack = [],
      _isNative;
      
  /**
   * Possible codes returned the error callback functions.
   * 
   * @namespace
   */
  bc.device.codes = {};

  /** An error occured. */
  bc.device.codes.GENERAL = 100;

  /** The user canceled this action. */
  bc.device.codes.USER_CANCEL = 101;
  
  /** The device is not running in a native container */
  bc.device.codes.COMMAND_ONLY_AVAILABLE_IN_A_NATIVE_APPLICATION = 102;
 
  $( bc ).bind( "init", function() {
    bc.device.setIsNative();
  });    
  
  /**
   * @private
   */
   bc.device.callbackHandle = function( id, data ) {     
     var associatedCallbackID,
         callbackData;
     
     if ( data ) {
       callbackData = JSON.parse( atob( data ) );
       callbackData = callbackData.result;
     }
    
     if( _callbackFunctionMap[id] ) {
       associatedCallbackID = _callbackFunctionMap[id].associatedCallbackID;
       _callbackFunctionMap[id].callback( callbackData ); 
       delete _callbackFunctionMap[id];
       if ( associatedCallbackID ) {
         delete _callbackFunctionMap[associatedCallbackID];   
       }
     } else {
       bc.utils.error( "The ID passed by the native container is not in the queue." );
     } 
   };
 
 /*****************************************
  * Native APIs
  ****************************************/
  
 /**
  * Determine whether we are running as a native application or as a web site.  If true, we are 
  * running as a native iPhone, Android  or other application.
  *
  * @return A boolean representing whether or not this is running as a native application.
  * @example
  *   if ( bc.device.isNative() ) {
         bc.device.takePhoto();
       } else {
         alert("No camera available when in a browser.");
       }
   }
  */
  bc.device.isNative = function() {
    if( _isNative !== undefined ) {
      return _isNative;
    } else {
      return bc.device.setIsNative();      
    }
  };
  
  /**
   * @private
   */
  bc.device.setIsNative = function() {
     var cachedValue = bc.core.cache( "isNative" );

     //Our first time visiting this page.
     if( cachedValue === null ) {
       _isNative = window.bc_isNative === true;
       bc.core.cache( "isNative", _isNative );
     } else {
       _isNative = cachedValue;
     }
     return _isNative;     
   }
   
  /**
   * @private
   */
  bc.device.playBCVideo = function( videoID, videoURL, successCallback, errorCallback ) {
    var query = "video_id=" + videoID + "&video_url=" + escape(videoURL);
    createNativeCall( successCallback, errorCallback, "bc:PlayVideo", query );
  };
  
 /**
  * Gets the current location of the user and calls into the success handler with the results.  What is
  * returned to the success handler is an object that looks like:
  * {"latitude":70.35, "longitude":40.34}
  * 
  * @param successCallback A function to be called with the results of the location look up.  This includes properties, latitude and longitude, which have values that are of type floats.
  * @param errorCallback An optional function that will be called if there is an error getting the location.  This callback is passed
  an object containing the property "errorCode", which maps one of the values specified on bc.device.codes, and a property of "errorMessage", which provides
  additionallay information about this error.
  * @example
  
  bc.device.getLocation( function( locationInfo ) {
                          if ( locationInfo.latitude > 80 ) {
                            alert("Brrrrr...");
                          }
                        },
                        function( data ) {
                          bc.utils.warn( data.errorCode );
                        }
                      );
  */
  bc.device.getLocation = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:GetLocation" );
  };
 
 /**
  * Get an existing photo from the user's photo library.  When this function is called, the device will bring up the
  * photo gallery. After the user chooses an image, the success handler is called.  If you want the user to use the camera to take a picture 
  * instead, use the takePhoto function instead.
  *
  * The success callback will be called with an object whose result value is a string pointing to the local path of the image.  Here is an
  * example of that object:<br/>
  * "/a/path/to/an/image.jpg"<br/>
  * 
  * <b>Note:</b> When using the Workshop application, the returned path will actually be a data-uri.  
  * In either case, you can set the resulting string to be the source of an image.
  *
  * @param successCallback A function to be called with the URL to the image.
  * @param errorCallback An optional function that will be called if an error is encountered, the device does not support getPhoto or the user cancels the action.  
    The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, and a property of "errorMessage", which provides
    additional information about this error.
  * @example  
  bc.device.getPhoto( function( data ) {
                        //data is the path to the image on the file system.
                      },
                      function( data ) {
                        bc.utils.warn( data.errorCode );
                      }
                    );
  *  
  */
  bc.device.getPhoto = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:GetPhoto" );
  };
 
 /**
  * Opens the camera and allows the user to take a picture.  Once the picture has been taken, the success handler is called.
  * If you want to access an image from the photo gallery, use the getPhoto function instead.
  * Here is an example of what the return object will look like:<br/>
  * "/a/path/to/an/image.jpg"
  *
  * <b>Note:</b> When using the Workshop application the returned path will actually be a data-uri.  
  * In either case, you can set the resulting string to be the source of an image.
  *
  * @param successCallback The function to be called with the URL to the image the user just took with their camera.
  * @param errorCallback The function that is called if an error is encountered, the device does not support taking a picture or the user cancels the action.
    The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, and a property of "errorMessage", which provides
    additional information about this error.
  * @example  
    bc.device.takePhoto( function( data ) {
                          //my success handler
                         },
                         function( data ) {
                           if( data.errorCode === bc.device.codes.USER_CANCEL ) {
                             //Convince them not to cancel.
                           }
                          
                         }
                      );  
  */
  bc.device.takePhoto = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:TakePhoto" );
  };
 
 /**
  * Checks to see if this device has a camera available.  The
  * success handler will be called with an object that looks like:
  * 
  * true if the camera is available or false if it is not
  *
  * @param successCallback The function to be called with a boolean specifying whether or not a camera is available.
  * @param errorCallback The function that is called if an error is encountered.  The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the
    codes defined on bc.device.codes, and a property of "errorMessage", which provides
    additionallay information about this error.
  * @example  
    bc.device.isCameraAvailable( function( data ) {
                                   alert( "Camera available? " + data );
                                   if( data ) {
                                     alert( "Camera is available!" );
                                   } else {
                                     alert( "No camera :( ");
                                   }
                                 },
                                 function( data ) {
                                   bc.utils.warn( data.errorCode );
                                 }
                              );
    
  */
  bc.device.isCameraAvailable = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:IsCameraAvailable" );
  };
 
 /**
  * Take a picture with the device camera and then email that picture to the provided email address, along with the 
  * subject and message in the email.
  *
  * @param toAddress The email address that the photo should be sent to.
  * @param successCallback The function to be called after the user has sent the email.
  * @param errorCallback The function that is called if this is not supported, if there is an error, or if the user cancels out of the process.  The errorCallback function 
    is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, and a property of "errorMessage", which provides
    additional information about this error.
  * @param options Object of optional parameters that can be passed.  Options include
  * <ul>
  *   <li>subject: The subject used for the email.
  *   <li>body: The text used in the body of the email.
  * </ul>
  * 
  * @example  
    bc.device.takePhotoAndEmail( 'jobs@brightcove.com', 
                                 'Sweet picture',
                                 'Look at that!',
                                 function( data ) {
                                   //my success handler
                                 },
                                 function( data ) {
                                  bc.utils.warn( data.errorCode );
                                 },
                                 {
                                   "subject":"My Subject",
                                   "body":"Check out my sweet picture!"
                                 }
                              );
  * @private
  * 
  */
  bc.device.takePhotoAndEmail = function( toAddress, successCallback, errorCallback, options ) {
    var optionsAsParams = objectToQueryParams( options );    
    var queryArgs = "toAddress=" + toAddress + "&" + optionsAsParams;
    createNativeCall( successCallback, errorCallback, "bc:TakePhotoAndEmail", queryArgs );
  };
 
 /**
  * Switches the current view that is in focus.  For views based upon a menu or tab bar navigation
  * controller, this will have the effect of switching both the visible view and the selected tab.
  *
  * If the success handler is called, no parameters are passed.
  * 
  * @param index The index of the page that should be brought into focus.
  * @param errorCallback An optional argument that is a function that will be called if there is an error trying to switch views.
    The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, 
    and a property of "errorMessage", which provides additionallay information about this error. 
  * @example 
    bc.device.navigateToIndex( function( data ) {
                                 //my success handler
                               },
                               function( data ) {
                                bc.utils.warn( data.errorCode );
                               }
                            );
  *  
  * @private
  */
  bc.device.navigateToIndex = function( index, successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:NavigateToIndex", "index=" + index);
  };
  
  /**
   * @private
   */
  bc.device.navigateToView = function( uri, successCallback, errorCallback, options ) {
    var optionsAsParams = objectToQueryParams( options );    
    var queryArgs = "uri=" + encodeURIComponent(uri) + "&" + optionsAsParams;
    createNativeCall( successCallback, errorCallback, "bc:NavigateToView", queryArgs);
  };
  
 /**
  * Retrieves the information about the device that the application is running on.
  *
  * @example  
  bc.device.getDeviceInfo( function( data ) {
                             //my success handler
                           },
                           function( data ) {
                             bc.utils.warn( data.errorCode );
                           }
                        );
   * @param successCallback The function that is called by the container once the device has been retrieved.
   * @param errorCallback The function that is called if there is an error retrieving the device info.
     The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, 
     and a property of "errorMessage", which provides additionallay information about this error.
   * @private
  */
  bc.device.getDeviceInfo = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:GetDeviceInfo");
  };
 
 /**
  * Fetches the content of a given URL and returns the contents as a string. Making a call to any domain is allowed.
  *  This is useful if you need to make calls that would normally not be allowed via an AJAX
  * call because of cross-domain policy.  
  *
  * Upon success, an object will be passed to the success handler that looks like: "URL contents"
  *
  * @example  
    bc.device.fetchContentsOfURL( 'http://my.sweet.feed/blob.xml',
                                  function( data ) {
                                    //data is equal to the contents of http://my.sweet.feed/blob.xml as a string.
                                  },
                                  function( data ) {
                                    bc.utils.warn( data.errorCode );
                                  }
                                );
   *
   * @param url The URL that the request should be made to.
   * @param successCallback The function that is called once the contents of the URL have been fetched.  The callback is passed a string which is the contents of the URL.
   * @param errorCallback The function that is called if there is an error fetching the contents of the URL.
     The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, 
     and a property of "errorMessage", which provides additionallay information about this error.
  */
  bc.device.fetchContentsOfURL = function( url, successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:FetchContentsOfURL", "url=" + escape( url ) );
  };
 
 /**
  * Vibrates the device if the current device supports it.
  *
  * @example  
    bc.device.vibrate( function( ) {
                         //my success handler
                       },
                       function( data ) {
                         bc.utils.warn( data.errorCode );
                       }
                     );
  *
  * @param successCallback The function to be called if the phone successfully vibrates.
  * @param errorCallback The function to be called if there is an error vibrating the phone.
    The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, and a property of "errorMessage", which provides
    additionallay information about this error.
  */
  bc.device.vibrate = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:Vibrate" );
  };

  
 /**
  * Specify which direction(s) the application can be rotated in.  The directions should be passed in as an array and can take in five different values of:
  * <ul>
  * <li> bc.ui.orientation.PORTRAIT </li>
  * <li> bc.ui.orientation.LANDSCAPE_LEFT </li>
  * <li> bc.ui.orientation.LANDSCAPE_RIGHT </li>
  * <li> bc.ui.orientation.PORTRAIT_UPSIDEDOWN </li>
  * <li> "all" </li>
  * </ul>  
  *
  * @example  
   bc.device.setAutoRotateDirections ( [bc.ui.orientation.PORTRAIT, bc.ui.orientation.LANDSCAPE_RIGHT],
                                       function() {
                                         //my success handler
                                       },
                                       function( data ) {
                                         bc.utils.warn( data.errorCode );
                                       }
                                     ); 
  
  * @param direction An array of direction that the device can rotate to.  Possible values are: bc.ui.orientation.PORTRAIT, bc.ui.orientation.LANDSCAPE_LEFT, bc.ui.orientation.LANDSCAPE_RIGHT, bc.ui.orientation.PORTRAIT_UPSIDEDOWN or simply 'all'.
  * 
  * @param successCallback The function to be called if this registration successfully happens.
  * @param errorCallback The function to be called if there is an error.
        The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, 
        and a property of "errorMessage", which provides additionallay information about this error.
  */
  bc.device.setAutoRotateDirections = function( directions, successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:SetAutoRotateDirections", "directions=" + directions.join(",") );
  };

  /**
   * Make the application go full screen, hiding any other visible parts of the application except for the active view.  For example,
   * if running in the iOS container, this will hide the tab bar.
   * 
   * @param successCallback The function to be called once the application goes into full screen.
   * @param errorCallback The function to be called if there is an error going into full screen.
     The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, 
     and a property of "errorMessage", which provides additionallay information about this error.
   * @param options An object with a set of optional parameters that can be passed in to control behavior.
   * <ul>
   *   <li>hideStatusBar: A boolean indicating whether on iOS devices the status bar should be hidden when going full screen. This defaults
   *    to false.
   * </ul>
   * @example 
    bc.device.enterFullScreen( 
                          function() {
                            alert("I'm fullscreen!");
                          },
                          function( data ) {
                            bc.utils.warn( data.errorCode );
                          },
                          {
                            "hideStatusBar":"true"
                          }
              );
   */
  bc.device.enterFullScreen = function( successCallback, errorCallback, options ) {
    var hideStatusBar;
    
    if ( options && options.hideStatusBar ) {
      hideStatusBar = options.hideStatusBar;
    } else {
      hideStatusBar = false;
    }
    createNativeCall( successCallback, errorCallback, "bc:EnterFullScreen", "hideStatusBar=" + hideStatusBar ); 
  };

  /**
   * Exit full screen of the application.
   *
   * @param successCallback The function that is called once we have exited full screen.
   * @param errorCallback The function that is called if we hit an issue exiting full screen.
     The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, and a 
     property of "errorMessage", which provides additionallay information about this error.
   * @example
    bc.device.exitScreen( function() {
                            alert("I'm not fullscreen!");
                          },
                          function( data ) {
                            bc.utils.warn( data.errorCode );
                          }
                        );   
   */
  bc.device.exitFullScreen = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:ExitFullScreen" ); 
  };

  /**
   * Returns a boolean indicating whether or not the application is in full screen.  The returned
   * object is true if we are in full screen or false if not.
   *
   * @param successCallback The function to be called with data specifying whether or not the application is in full screen mode.
   * @param errorCallback The function to be called if there is an error.
     The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, 
     and a property of "errorMessage", which provides additionallay information about this error.
   * @example bc.device.isFullScreen( function( data ) {
                                        if( data ) {
                                          alert( "I am in fullscreen" );
                                        } else {
                                          alert( "I am NOT in fullscreen" )
                                        }
                                     },
                                     function( data ) {
                                       bc.utils.warn( data.errorCode );
                                     }
               );
   */
  bc.device.isFullScreen = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:IsFullScreen" ); 
  };

  /**
   * Shows an alert in a native dialog.  This is useful to use instead of a JavaScript alert function
   * call, because the JavaScript alert will show the name of the page (e.g., videos.html) which is
   * not always desirable.  The success handler will be called after the user has dismissed the 
   * alert.   
   *
   * @param message The message to show in the native alert dialog.
   * @param successCallback The function to be called after the dialog alert has been dismissed.
   * @param errorCallback The function to be called if an error occurs.
     The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the codes defined on bc.device.codes, 
     and a property of "errorMessage", which provides additionallay information about this error.
   * @example 
    bc.device.alert( "Many turkeys are a rafter",
                      function() {
                        // my success handler
                      },
                      function( data ) {
                        bc.utils.warn( data.errorCode );
                      }
              });
   */
  bc.device.alert = function( message, successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:Alert", "message=" + message );
  };

  /**
   *@private
   */
  bc.device.isViewShowing = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:IsViewShowing" );
  };
  
  /**
   *@private
   */
  bc.device.setAdPolicy = function( ad_policy, successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:SetAdPolicy", objectToQueryParams( ad_policy ) );
  };
  
  /**
   * Brings up a native QR scanner to read 2D QR codes.  On success, this will call the successCallback passing the function the string that 
   * reflects the scanned QR code.
   *
   * @param successCallback The function that is called once the QR code has been read.  The successCallback is passed a string that reflects the QR code.
   * @param errorCallback The function that is called if an error occurs.  The errorCallback function is passed an object that contains a property of "errorCode", which maps to one of the
     codes defined on bc.device.codes, and a property of "errorMessage", which provides additional information about this error.
   */
  bc.device.getQRCode = function(successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:GetQRCode" );
  };
  
  /**
   * @private
   */
  bc.device.goBack = function( successCallback, errorCallback ) {
    createNativeCall( successCallback, errorCallback, "bc:GoBack" );
  }
  
  /**
   * Config for Facebook information.
   * @private
   */  
   bc.device.facebookConfig = function(configs, successCallback, errorCallback) {
     createNativeCall( successCallback, errorCallback, "bc:facebookLogin", objectToQueryParams(configs) );
   }
  
   /**
    * Prompt Facebook login dialog to let user login
    * @return basic Facebook user information
   * @private    
    */  
   bc.device.facebookLogin = function(successCallback, errorCallback) {
     createNativeCall( successCallback, errorCallback, "bc:facebookLogin" );
   }
  
   /**
    * Log out the current Facebook account. This will happen behind the scene. There is NO prompt dialog
    * for confirmation now. 
    * @private    
    */  
   bc.device.facebookLogout = function(successCallback, errorCallback) {
     createNativeCall( successCallback, errorCallback, "bc:facebookLogout" );
   }
  
   
   /**
    * Expose Facebook dialog APIs. (http://developers.facebook.com/docs/reference/dialogs/). Besides all the options 
    * described in Facebook documents, you need to have one more parameter, "action", to describe which dialog you want 
    * to use. 
    * 
    * For example, you need following options to post a feed to the wall:
    *  { "action": "feed", "link": "http://www.brightcove.com", "message": "check this out!"}
    * @private
    */  
   bc.device.facebookDialog = function(options, successCallback, errorCallback) {
     createNativeCall( successCallback, errorCallback, "bc:facebookDialog", objectToQueryParams(options) );
   }
   
   /**
    * Internal API for container to fire JavaScript event
    * @private
    */
   bc.device.trigger = function( eventType, eventData ) {
     if(eventData === undefined) {
       $( bc ).trigger( eventType );
     } else {
       $( bc ).trigger( eventType, [ JSON.parse( atob( eventData ) ).result ]);
     }
   }
  
 /*****************************************
  * Utility functions
  ****************************************/
  

  /**
   *@private
   */
  function createNativeCall( successCallback, errorCallback, command, queryArgs ) {
    if( successCallback === undefined ) {
      bc.utils.warn( "no success handler passed into native API call." );
      successCallback = function() {/*noop*/};
    }

    if( errorCallback === undefined ) {
      errorCallback = function() {/*noop*/};
    }
    
    if( !bc.device.isNative() ) {
      return errorCallback( { "errorCode": bc.device.codes.COMMAND_ONLY_AVAILABLE_IN_A_NATIVE_APPLICATION, 
                              "errorMessage": command + " is not available for non native applications"
                            }
                          );
    }

    var successCallbackID = bc.utils.uniqueID();
    var errorCallbackID = bc.utils.uniqueID();
        
    _callbackFunctionMap[successCallbackID] = { "associatedCallbackID": errorCallbackID, 
                                                "callback": successCallback };    

    _callbackFunctionMap[errorCallbackID] = { "associatedCallbackID": successCallbackID,
                                              "callback": errorCallback };

    command = command + "?successCallbackID=" + successCallbackID + "&errorCallbackID=" + errorCallbackID;
    if ( queryArgs ) {
      command += "&" + queryArgs;
    }
    
    bc.device.nativeCall( command );   
 }
 
 /*****************************************
  * Helper functions
  ****************************************/
 
  function objectToQueryParams( obj ) {
    var params = [];
    $.each( obj, function( key, value ) {
      params.push( key + "=" + encodeURIComponent( value ) );
    });
    
    return params.join( "&" );
  }
 
  function encodeObjectAsDictionary( a, objectCtxt ) {
    return encodeObject( a, objectCtxt );
  }

  function encodeObject( a, objectCtxt ) {
    var queryString = "",
        firstTime = true,
        ctxt,
        prop;

    for (prop in a) {
      if ( a.hasOwnProperty( prop ) ) {
        if ( firstTime ) {
          firstTime = false;
          ctxt = objectCtxt + "[" + i + "]";
          queryString = encodeValue( a[i], ctxt );
        } else {
          ctxt = objectCtxt + "[" + i + "]";
          queryString = queryString + "&" + encodeValue( a[i], ctxt );
        }
      }
    }

    return queryString;
  }

  function encodeValue( v, ctxt ) {
    var encodedValue = "";
    if ( typeof( v ) === "string" || typeof( v ) === "number" ) {
      encodedValue = ctxt + "=" + v;
    } else {
      encodedValue = encodeObject( v, ctxt );
    }
    return encodedValue;
  }
 
 
 /*****************************************
  * Internal use only
  ****************************************/
 /**
  * @private
  */
  bc.device.getCallbackFunctionMap = function() {
    return _callbackFunctionMap;
  };
 
 /**
  * @private
  */
  bc.device.clearCallbackFunctionMap = function() {
    _callbackFunctionMap = {};
  };
 
 /**
  * @private
  */
  bc.device.nativeCall = function( api ) {
   // window.androidCommandQueue is inject by the android container
   if( window.androidCommandQueue !== undefined ) {
     window.androidCommandQueue.enqueue( api );
   } else {
     _callStack.push( api );
    }
  };
 
 /**
  * @private
  */
  bc.device.popNativeCall = function() {
    return _callStack.pop();
  };
  
}( bc.lib.jQuery ));