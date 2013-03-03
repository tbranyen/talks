// Namespace: app
// Module: reader
// Handles the book reader logic
(function(window, document, $, undefined) {
    // Namespace: APP
    var app = window.app = window.app || {};
            // Module: Reader
    app.reader = function(self) {
        // Module references
        // Settings reference
        var settings = app.settings = app.settings || {};
        // DOM references
        var win = $(window),
                viewer = $("#book-viewer"),
                content = viewer.find("div.content"),
                arrows = $("#arrow-navigation");
        // Arrow delay
        var arrow_delay,
            // Last scrollY
            lastScrollY,
            // Original scrollY
            originalScrollY;
        // Cache
        var cache = {},
                pageData = {};
        // Book loader
        self.init = function(start_page) {
            // Useful, keep a reference
            settings.internal = settings.internal || {};
            settings["internal"]["start_page"] = start_page;
            // TODO: Refactor this to be more accurate
            // Set pageData
            pageData = {
                'prevPage': undefined,
                'nextPage': window.pagelist[1],
                'pageNumber': 1
            };
            // Hijack all links
            content.find("a").live("click", function(evt) {
                // Normalize to filename
                var href = settings["BOOK_PATH"] +"/"+ this.href.substring(this.href.lastIndexOf("/")+1);
                // Add to history
                $.bbq.pushState({ 'url': href });
                // Hide all content show book content
                self.showSection("book-viewer");
                // Stop event
                return app.core.utils.stopEvent(evt);
            });

            $.fn.cssFadeOut = function(_callback, _time) {
                typeof _callback == 'undefined' ? _callback = $.noop : _callback;
                $(this).hide();
                $('#book-viewer').addClass('loading');
                _callback();
            };
            
            $.fn.cssFadeIn = function(_callback, _time) {
                typeof _callback == 'undefined' ? _callback = $.noop : _callback;
                $(this).show();
                $('#book-viewer').removeClass('loading');
                _callback();
            };

            // Handle hash changes, specifically for book urls
            win.bind("hashchange", function(evt) {
                // Display correct book page
                var parts = ($.bbq.getState("url") || settings['INITIAL_PAGE']).split('/'),
                        match = parts[parts.length-1].toLowerCase(),
                        displayName = match.split('.')[0];
                        
                if ($.inArray(match, window.pagelist) === -1) {
                    alert('Invalid page selected');
                    self.showSection("book-viewer");
                    return;
                }
                $('#page-number').val( isNaN(displayName) ? displayName : parseInt(displayName, 10) );
                self.page( content, $.bbq.getState("url") || start_page );

                // Reset to page view
                $.bbq.removeState("img");
            });
            /* FIXME: Clean this up */
            $('#page-number').bind("change keyup", function(evt) {
                if(evt.which === 13 || evt.type === "change") {
                    if (this.value && this.value != "toc") {
                        var id = (isNaN(this.value)) ? this.value : app.core.utils.pad(this.value, 4);
                        $.bbq.pushState({ 'url': settings.BOOK_PATH + '/' + id + '.html' });
                    }
                }
            });
            
            var start = { x: 0, y: 0 }, move = false, mode, touch;
            $("#book-viewer")
                .bind("touchstart", function(evt) {
                    touch = evt.touches[0];
                    start.x = touch.pageX;
                    start.y = touch.pageY;
                    move = false;
                    mode = undefined;
                })
                .bind("touchmove", function(evt) {
                    touch = evt.touches[0];
                    if (!mode) {
                        // Check y
                        if( Math.abs(touch.pageY-start.y) > 15 )
                            mode = "scroll";
                        
                        if(!mode) {
                            // Checking x
                            if( touch.pageX-start.x > 30) {
                                move = "previous";
                                mode = "swipe";
                            }
                            else if( touch.pageX-start.x < -30) {
                                move = "next";
                                mode = "swipe";
                            }
                        }
                    }
                    
                    if(mode === "swipe") {
                        return app.core.utils.stopEvent(evt);
                    }
                })
                .bind("touchend", function(evt) {
                    if( $(evt.target).is("img, a, input") && (mode !== "swipe" || mode !== "scroll") && !move ) {
                        return true;
                    }                        
                    if(mode === "swipe" && move) {
                        self[move +'Page']();
                        return app.core.utils.stopEvent(evt);
                    }
                });
            
            // setup iScroll if using an iPad or other tablet
            if (app.settings.internal.isBigScreen) {
                $('#toolsmenu').wrap('<div id="toolswrapper"/>');
                app.settings.internal.myScroll = new iScroll('toolsmenu');
            }
            
            $('a.show-tools').click(function() {
                if(settings.internal.isBigScreen && $("#tools").is(":visible")) {
                    app.reader.showSection("book-viewer");
                }
                else {
                    app.reader.showSection("tools");
                }
                $(this).toggleClass("visible");
                return false;
            });
            
            $('a.goBack').click(function() {
                $('.window').hide();
                $('#book-viewer.window').show();
                return false;
            });
            
            $('a.toc').click(function() {
                app.reader.showSection('toc');
                return false;
            });
            
            $("#search .return").bind("click", function(evt) {
                $(window).trigger("hashchange");
                
                return app.core.utils.stopEvent(evt);
            });
            
            $('#index > div.menu > a.return').click(self.showIndex)

            $("a.prev-page").click(function() { self.previousPage(); return false; });
        
            $("a.next-page").click(function() { self.nextPage(); return false; });
            
            var tempval;
            $('#page-number').focus(function() {
                tempval = this.value;
                this.value = '';
            });
            
            $('#page-number').blur(function() {
                if (this.value.length == 0) {
                    this.value = tempval;
                }
            });
            
            if(app.settings.internal.isBigScreen) {
                $("#tools").clear("body, .tools-icon.visible", "#tools", "click", function() {
                    if( $("#tools").is(":visible") ) {
                        $(this).find("ul.root-menu").data("surfaceToTop")();
                    }
                    $(this).hide();
                });
            }
            
            win.trigger("hashchange");
            return self;
        };
        // Render the page
        self.render = function(content, html) {
            content.html( html );
            // calculate the height for the image, needed since max-width: 100%; and height: auto; cause
            // the page to jump while loading images
            content.find('img').each(function () {
                $(this).css( 'height', this.getAttribute('height') * (this.width / this.getAttribute('width')) );
            }).load(function(e) {
                $(this).css( 'height', 'auto');
            });

            // Highlight search words
            var query = app.search.getQuery(); 
            if(query.length) {
                content.find("*").replaceText(new RegExp(query, "gi"), function(match) {
                    return "<span class='search-highlight'>"+ match +"</span>";
                });
            }
            
            self.showSection("book-viewer");

            // Fix for iPad and iPhone, triggers reflow
            viewer.css("opacity", ".99");
            window.setTimeout(function() { 
                viewer.css("opacity", "1");
            }, 50);

            // FIXME
            try {
                if(Modernizr.events["touchstart"] || Modernizr.events["mousedown"])
                    $("#pageheader, #pagefooter").hide();
                // Scan through pagelist array for current page, set previous/next/current page in UI
                if (window.pagelist) {
                    var normalize = $.bbq.getState("url") || settings['INITIAL_PAGE'];
                    for (var i=0; window.pagelist[i]; i++) {
                        var parts = normalize.split('/'),
                                pageNumber = parts[parts.length-1];
                        if (pageNumber == window.pagelist[i]) break;
                    }
                    // TODO: Fix this section below and above
                    // Set toc i to 0
                    pageNumber = (normalize.indexOf("toc") > -1) ? 0 : pageNumber;
                    i = i % window.pagelist.length;
                    pageNumber = pageNumber.replace('.html','');
                    pageData['prevPage'] = window.pagelist[(i===0) ? i : i-1];
                    pageData['nextPage'] = window.pagelist[(i===window.pagelist.length-1) ? i : i+1];
                    pageData['pageNumber'] = isNaN(pageNumber) ? pageNumber : parseInt(pageNumber, 10);
                }
            } catch(e) {};
            // Bring window contents back up to the top
            window.scrollTo(0, 0);
        };
        // Go to a specific page
        self.page = function(content, href) {
            content.empty();
            if(cache[href]) {
                self.render( content, cache[href] );
                content.cssFadeIn(undefined, ".4s");
            }
            else {
                // Ajaxify the loading procedure
                app.core.load("html", href, function(xhr) {
                    // Stored the success data in an xhr textData property
                    data = $(app.core.utils.stringToXml(xhr.textData));
                    data.find("img").each(function() {
                        this.setAttribute("src", settings["BOOK_PATH"] +"/"+ this.getAttribute("src"));
                    });
                    // Process and render the content
                    var processed = app.core.utils.xmlToString( data.find("body")[0] );
                    self.render( content, processed );
                    cache[href] = processed;
                    content.cssFadeIn(undefined, ".4s");
                });
            }
        };
        
        // Push BBQ state to show previous page
        self.previousPage = function() {
            content.cssFadeOut(function() {
                $.bbq.pushState({ 'url': settings["BOOK_PATH"] +"/"+ pageData["prevPage"] });
            }, ".4s");
        };
        
        // Push BBQ state to show next page
        self.nextPage = function() {
            content.cssFadeOut(function() {
                $.bbq.pushState({ 'url': settings["BOOK_PATH"] +"/"+ pageData["nextPage"] });
            }, ".4s");
        };
        
        // FIXME: Move to app.core
        // Show a specific section cleanly        
        self.showSection = function(id, effect) {
            //FIXME: bad way to do this - float only the tools menu when on a big screen device
            var useFloatingMenu = (app.settings.internal.isBigScreen && id == 'tools');
            effect = effect || $.fn.show;
            $("body").removeClass( $("#interface > div.window:visible").attr("id") ).addClass(id);
            //effect.call( $("#" + id) );
            if (!useFloatingMenu) $("#interface > div.window").hide();
            $('#' + id).css({ display: 'block' });
            $('div.menu-content > a.tools').removeAttr('style');
            scrollTo(0,0);
            
            // For tools specifically reset the height as to avoid height: 0px bug in iPad
            if(id === "tools") {
                $("#toolsmenu").height( $("#toolswrapper").find(".root-menu").height() );
            }
            
            // If the new section has a div with menucontainer, move the UI elements into there
            // Use CSS to hide unneeded elements, eg the tools icon in the tools menu
            var dest = $("#"+ id +" > div.menucontainer");
            if (!dest.length) { return; }
            if (!useFloatingMenu) dest.append($('#portable-menu'));
        };     
        
        self.showIndex = function(e) {
            var $indexcontent = $('#index > .content').empty(),
                    letters = 'abcdefghijklmnopqrstuvwxyz';
            for (var i in letters) {
                if(!letters.hasOwnProperty(i)) continue;
                var link = $('<a class="letter" href="'+ settings.BOOK_PATH +'/index/'+ letters[i] +'.html">'+ letters[i].toString().toUpperCase() +'</a>');
                link.bind("click", function(evt) {
                    $('#index > div.menu > a.return').show();
                    $('#index > div.menu .tools').hide();
                    
                    $.get(this.href, function(data) {
                        data = '<div class="indexlist">'+ data +'</div>';
                        $('#index > .content').html(data).find('a').click( function(evt) {
                            $('#index > div.menu > a.return').hide();
                            $('#index > div.menu .tools').attr('style','');
                            
                            var page = this.href.split(',')[1];
                            page = (!!+page) ? app.core.utils.pad(page, 4) : page;
                            $.bbq.pushState({ 'url': settings["BOOK_PATH"] +"/"+ page +".html" });

                            return app.core.utils.stopEvent(evt);                        
                        });
                    });

                    return app.core.utils.stopEvent(e);
                });
                $indexcontent.append(link);
            }
            $('#index > div.menu > a.return').hide();
            $('#index > div.menu .tools').attr('style','');
            self.showSection('index');
            
            if (e) return app.core.utils.stopEvent(e);
        };
        
        return self;
    }({});
})(this, this.document, this.jQuery);
