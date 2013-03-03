// Namespace: app
// Module: tools
// Handles the tools logic
(function(window, document, $) {
    // Namespace: APP
    var app = window.app = window.app || {};
    // Module: Tools
    app.tools = function(self) {
        // Module references
        // Keep state information
        var state = {};
        // Settings reference
        var settings = app.settings = app.settings || {};
        // Book loader
        self.init = function() {
            state = self.utils.loadState() || {};
            
            // Handle settings clicked
            $('div.window').delegate('ul.root-menu a:only-child, ul.root-menu a', 'click', self.menuHandler);
            
            // Set the preset or loaded values class states
            $("#tools ul.menu li > a[data-key]").each(function() {
                var $this = $(this),
                    value = state[$this.attr("data-key")];
                // Preload state
                if( value && $this.attr("data-value") === value ) {
                    $this.trigger("click");
                    $this.parent().siblings().removeClass("selected");
                    $this.parent().addClass("selected");
                }
            });
        };

        self.toc = function(_callback) {
            if ($('#toc > ul').length) {
                return;
            }
            
            app.core.load("xml", app.settings.TABLE_OF_CONTENTS, function(xhr) {
                var $data = $(xhr.textData),
                        $list = $('<ul class="root-menu"/>'),
                        $nodes = $data.find('tree > node');
                $list.append('<li class="tocimg"><img src="'+ app.settings.TOC_HEADER +'" width="320" height="78"/></li>');
                
                $nodes.each(function(i, e) { 
                    var $item = $('<li/>');
                    
                    // This is potentially breakable, relies on the format "Chapter 10 Chapter Title"
                    var chapter = $(e).attr('name').split(/(Chapter \d+)/);
                    var html = (chapter.length > 1) ? '<span class="chapterlabel">'+ chapter[1] +'</span>'+ chapter[2] : chapter[0];
                    $item.append($('<a/>').attr('href', '#').html(html));
                    
                    var $sections = $(e).children('link');
                    if ($sections.length) {
                        var $subsection = $('<ul class="menu"/>');
                        $sections.each(function(i, e) {
                            var $subitem = $('<li><a href="#" rel="goto"/></li>');

                            $subitem.children('a')
                                .text($(e).text())
                                .attr('data-page', $(e).attr('href'));
                            $subsection.append($subitem);
                        });
                        $item.append($subsection);
                    }
                    
                    $list.append($item);
                });
                $('#toc div.content').append($list);
                $("#tools").find("ul.root-menu").slideMenu({
                    'surfaceCallback': function( menu ) {
                        if(settings.internal.isBigScreen) {
                            settings.internal.myScroll.refresh();
                            settings.internal.myScroll.scrollTo(0,0,200);
                        }
                        window.scrollTo(0,0);

                        $("#toolsmenu").height( menu.parents("ul").height() );
                    },
                    'diveCallback': function( menu ) {
                        if(settings.internal.isBigScreen) {
                            settings.internal.myScroll.refresh();
                            settings.internal.myScroll.scrollTo(0,0,200);
                        }
                        window.scrollTo(0,0);

                        // set the height of the content
                        $("#toolsmenu").height( menu.height() );
                        $("#toolsmenu").closest("ul").scrollTop(0);
                    }
                });

                $("#toc").find("ul.root-menu").slideMenu({
                    'surfaceCallback': function( menu ) {
                        if(settings.internal.isBigScreen) {
                            settings.internal.myScroll.refresh();
                            settings.internal.myScroll.scrollTo(0,0,200);
                        }
                        window.scrollTo(0,0);

                        $(this).closest("div.content").height( menu.parents("ul").height() );
                    },
                    'diveCallback': function( menu ) {
                        if(settings.internal.isBigScreen) {
                            settings.internal.myScroll.refresh();
                            settings.internal.myScroll.scrollTo(0,0,200);
                        }
                        window.scrollTo(0,0);

                        // set the height of the content
                        var $content = $(this).closest("div.content");
                        $content.height( menu.height() );
                        $content.closest("ul").scrollTop(0);
                    }
                });

                (_callback || $.noop)(this);
            });
            
            return self;
        };
        
        self.glossary = function(_callback) {
            app.core.load("xml", app.settings.GLOSSARY, function(xhr) {
                var $data = $(xhr.textData),
                    $list = $('<ul class="menu"/>'),
                    $nodes = $data.find("glossary > terms > item"),
                    reg_filter = /^\s+|\s+$/g,

                    // HTML placeholder (for speed)
                    items = "";

                $nodes.each(function() { 
                    var term = this.getElementsByTagName("term")[0].textContent,
                        def = this.getElementsByTagName("def")[0].textContent;

                    sub_menu = "<ul class='menu'><li class='definition'>"+ def +"</li></ul>";
                    items += '<li><a rel="goto-glossary-term">'+ term +'</a>'+ sub_menu +'</li>';
                });
                $list.html(items);
                $('#glossary').append($list);

                (_callback || $.noop)(this);
            });
        };

        self.menuHandler = function(evt) {
            var anchor = this,
                $this = $(this),
                page,
                setting = anchor.rel || anchor.getAttribute("data-key");
            switch(setting) {
                case "reading-color":
                    var color = anchor.getAttribute("data-value");
                   
                    if(color === "dark") {
                        $('body').addClass("dark");
                    }
                    else {
                        $('body').removeClass("dark");
                    }
                    
                    state[anchor.getAttribute("data-key")] = color;
                break;
                
                case "font-size":
                    var size = anchor.getAttribute("data-value");
                    
                    state[anchor.getAttribute("data-key")] = anchor.getAttribute("data-value");
                    $('body').removeClass('smallFont mediumFont largeFont');
                    $('body').addClass( size );
                break;
                
                case "goto":
                    page = anchor.getAttribute("data-page");
                    page = app.core.utils.isNumeric(page) ? app.core.utils.pad(page, 4) : page;
                    $.bbq.pushState({ 'url': settings.BOOK_PATH +"/"+ page +".html" });
                    
                    app.reader.showSection("book-viewer");
                    window.setTimeout(function() {
                        $this.closest("ul.root-menu").data("surfaceToTop")();
                    }, 1);
                break;
            
                case "goto-search":
                    page = anchor.getAttribute("data-page");
                    page = app.core.utils.isNumeric(page) ? app.core.utils.pad(page, 4) : page;
                    
                    if($.bbq.getState("url") === settings.BOOK_PATH +"/"+ page +".html") {
                        $(window).trigger("hashchange");
                    } 
                    else {
                        $.bbq.pushState({ 'url': settings.BOOK_PATH +"/"+ page +".html" });
                    }
                    app.reader.showSection("book-viewer");
                break;
                
                case "about":
                    window.alert("About APP Reader");
                break;
            
                case "search":
                    app.reader.showSection("search");
                break;
            
                case "goto-glossary-term":
                    $this.next().find("li").html( $("<img/>").attr("src", $this.attr("href")) );
                break;
            
                case "index":
                    app.reader.showIndex();
                break;
            }
            
            // Only change selected for those that have settings
            if( anchor.getAttribute("data-key") ) {
                $this.closest('li').siblings().removeClass("selected");
                $this.closest('li').addClass("selected");
            }
            
            self.utils.saveState();
            return app.core.utils.stopEvent(evt);
        };
        
        self.utils = function() {
            return {
                'saveState': function() {
                    var title = settings.BOOK_TITLE;
                    app.core.utils.eraseCookie(title);
                    app.core.utils.createCookie(title, JSON.stringify(state), 90);
                },
                'loadState': function() {
                    var title = settings.BOOK_TITLE,
                            strState = app.core.utils.readCookie(title);
                    
                    return (strState) ? JSON.parse(strState) : undefined;
                }
            };
        }();
        
        return self;
    }({});
})(this, this.document, this.jQuery);
