(function(window, document, $) {
    var app = window.app = window.app || {};
    /*
        Class: app.core 

        Contains fundamental core functionality: dynamic code loading, bootstrap loading, and utility functions.

        Returns:
            self - All public methods.
    */
    app.core = function(self) {
        // Module references
        // Settings reference
        var settings = app.settings = app.settings || {};
        settings.internal = settings.internal || {};
        /*
            Function: init

            Bootstrap application entry point loader.  Invoked on page load, loads in the rest of the APP modules.

            Parameters:
                settings_file - A string indicating the location of the javascript configuration file.
        */
        self.init = function(settings_file) {
            // Load in the settings file
            self.load("script", settings_file, function(xhr, status) {
                if(status !== "success") {
                    window.alert("Invalid configuration file.");
                }
                // Normalize cover path
                var cover = window.navigator.userAgent.toLowerCase().indexOf("ipad") > -1 ?
                    settings.COVER_WEBCLIP.ipad : settings.COVER_WEBCLIP.iphone;
                // Set book icon
                $("<link rel='apple-touch-icon'/>")
                    .attr("href", settings.COVER_WEBCLIP.icon).appendTo("head");
                // Set startup image
                $("<link rel='apple-touch-startup-image'/>")
                    .attr("href", cover).appendTo("head");
                // Load in additional scripts
                for(var i=0; settings.BOOK_SCRIPTS[i]; i++) {
                    var n = i;
                    $.getScript(settings.BOOK_SCRIPTS[i], function(xhr, status) {
                        // All scripts have finished loading
                        if( (n+1) === settings.BOOK_SCRIPTS.length) {
                            // Load in additional stylesheets
                            for(var i=0; settings.BOOK_STYLES[i]; i++) {
                                self.load("link", settings.BOOK_STYLES[i]);
                            }
                            // Initiatilze components
                            settings.internal.isBigScreen = (window.innerWidth >= 768);
                            app.reader.init( settings.INITIAL_PAGE );
                            app.image.init();
                            app.search.init();
                            
                            // Tools needs to be init'd after toc finishes loading
                            var test;
                                
                            test = function() {
                                app.tools.toc(function() {
                                    app.tools.init();
                                });
                            }
                            if(window.navigator.userAgent.toLowerCase().indexOf("blackberry") > -1) {
                                test();
                            }
                            else {
                                app.tools.glossary(test);
                            }
                        }
                    });
                }
            });
        };
        /*
            Function: load

            Master load function, since jQuery $.ajax is often not entirely sufficient
            this function normalizes types such as html, xml, jsonp, etc. to be more
            useful within the APP application context.

            Parameters:
                type - String matching a valid jQuery dataType.
                path - String either absolute URL for types like JSONP or relative for
                       types like HTML/XML.
                callback - Function to be called after loading has occured.
        */
        self.load = function(type, path, callback) {
            // Load data types differently
            switch(type) {
                // Ajax loading
                case "json":
                case "script":
                case "html":
                case "xml":
                    $.ajax({
                        'url': path,
                        'dataType': type,
                        'error': function() {
                            window.alert("Unable to load file: "+ path);
                        },
                        'success': function(data, status, xhr) {
                            if(typeof data !== "undefined") {
                                xhr.textData = data;
                            }
                        },
                        'complete': $.isFunction(callback) ? callback : $.noop
                    });
                    break;
                case "jsonp":
                    $.ajax({
                        'url': path,
                        'dataType': type,
                        'success': $.isFunction(callback) ? callback : $.noop
                    });
                    break;
                // Load HTML using success callback instead of complete
                case "image":
                    $("#image-viewer").find("div.content").empty().append("<img class='image-viewer-content' src='"+ path +"'/>");
                break;
                case "link":
                    $("<link rel='stylesheet' type='text/css'>").attr("href", path).appendTo("head");
                    (callback || $.noop)();
                    break;
                default:
                    break;
            }
        };
        self.utils = function() {
            return {
                /*
                    Function: utils.pad

                    Prepends 0s to a String representation of a Number.

                    Parameters:
                        data - String or Number to be padded.
                        zeros - Number of 0s to be prepended.

                    Returns:
                        str - Padded String
                */
                'pad': function(data, zeros) {
                    var str = data +"";
                    while ( str.length < zeros) {
                        str = "0"+ str;
                    }
                    
                    return str;
                },
                /*
                    Function: utils.stringToXml

                    Converts a String to a mutable XML Document.

                    Parameters:
                        xml - String representation of the XML.

                    Returns:
                        doc - XML Document
                */
                'stringToXml': function(xml) {
                    var doc;
                    if(window.ActiveXObject) {
                        doc = new window.ActiveXObject("Microsoft.XMLDOM");
                        doc.async = "false";
                        doc.loadXML(xml);
                        
                        return doc;
                    }
                    else if(typeof window.DOMParser !== "undefined") {
                        return (new window.DOMParser()).parseFromString(xml,"text/xml");
                    }
                    
                    doc = document.implementation.createDocument("", null, null);
                    doc.open();
                    doc.write(xml);
                    doc.close();
                    return doc;
                },
                /*
                    Function: utils.xmlToString

                    Renders an XML Document to a String.

                    Parameters:
                        doc - XML Document.

                    Returns:
                        rendered - String representation of the XML Document.
                */
                'xmlToString': function(doc) {
                    var rendered;
                    if(doc.xml) {
                        rendered = doc.xml;
                    }
                    else if(typeof window.XMLSerializer !== "undefined") {
                        rendered = (new window.XMLSerializer()).serializeToString(doc);
                    }
                    else {
                        rendered = doc.innerHTML;
                    }

                    return rendered;
                },
                /*
                    Function: utils.stopEvent

                    Completely ends an event cycle from bubbling, executing default action,
                    and any other *like* events.

                    Parameters:
                        evt - Event object.

                    Returns:
                        false
                */
                'stopEvent': function(evt) {
                    evt.stopPropagation();
                    evt.preventDefault();
                    return false;
                },
                /*
                    Function: utils.createCookie

                    Creates a browser cookie.

                    Parameters:
                        name - String name to use for the cookie.
                        value - String value to store.
                        days - Number of days to store for, leave blank for session.
                */
                'createCookie': function(name, value, days) {
                    var expires;
                    if (days) {
                        var date = new Date();
                        date.setTime(date.getTime()+(days*24*60*60*1000));
                        expires = "; expires="+ date.toGMTString();
                    }
                    else {
                        expires = "";
                    }
                    
                    document.cookie = name +"="+ value + expires +"; path=/";
                },
                /*
                    Function: utils.readCookie

                    Reads in a cookie value, by its name.

                    Parameters:
                        _name - String representing the cookie id.

                    Returns:
                        value - Either a String containing the cookie value or undefined.
                */
                'readCookie': function(_name) {
                    var name = _name +"=",
                        ca = document.cookie.split(';'),
                        value;

                    for(var i=0; ca[i]; i++) {
                        var c = ca[i];
                        while(c.charAt(0) === ' ')  {
                            c = c.substring(1, c.length);
                        }

                        if(c.indexOf(name) === 0) {
                            value = c.substring(name.length, c.length);
                        }
                    }
                    
                    return value;
                },
                /*
                    Function: utils.eraseCookie

                    Converts a String to a mutable XML Document.

                    Parameters:
                        xml - String representation of the XML.

                    Returns:
                        doc - XML Document
                */
                'eraseCookie': function(name) {
                    this.createCookie(name, "", -1);
                },
                /*
                    Function: utils.isNumeric

                    Ensures an Object is a valid Number.  Using the defacto, CMS (http://codingspot.com/) Function.

                    Parameters:
                        _var - Generic Object to be tests for type Number.

                    Returns:
                        Boolean - True for Number.
                */
                'isNumeric': function(_var) {
                    return !isNaN(parseFloat(_var)) && isFinite(_var);
                }
            };
        }();
        
        return self;
    }({});
})(this, this.document, this.jQuery);
