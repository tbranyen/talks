(function(window, document, $, undefined) {
    var app = window.app = window.app || {};

    app.search = function(self) {
        // Module references
        // Settings reference
        var settings = app.settings = app.settings || {};
        // DOM references
        var win = $(window),
                viewer = $("#book-viewer"),
                content = viewer.find("div.content"),
                arrows = $("#arrow-navigation");
        // Search specific
        var query = "",
            offset = 0,
            total_results = 0;
        // Search loader
        self.init = function() {
            viewer.find(".search-box .back").bind("click", function(evt) {
                app.reader.showSection("search");

                return app.core.utils.stopEvent(evt);
            });

            viewer.find(".search-box .clear").bind("click", function(evt) {
                viewer.find(".search-box").hide();
                query = "";
                self.clear();
                win.trigger("hashchange");

                return app.core.utils.stopEvent(evt);
            });

            $("#search-form").bind("submit", function(evt) {
                self.clear(); 
                viewer.find(".search-box").show();

                query = $("#search-query").val();
                if(!query.length) {
                    window.alert("Invalid search query");
                    $("#search-query").focus();
                    return app.core.utils.stopEvent(evt);
                }
                
                // Get initial results
                offset = 0;
                self.search();

                return app.core.utils.stopEvent(evt);
            });

            // Delegate the lis to trigger inner click
            $("#search ul").delegate("li", "click", function(evt) {
                if( $(evt.target).is("a") ) return true;
                $(this).find("a").trigger("click");

                return app.core.utils.stopEvent(evt);
            });

            // Bind the next and prev pagination controls
            $("#search div.pagination a").bind("click", function(evt) {
                self[this.className +"Results"]();
                return app.core.utils.stopEvent(evt);
            });
        };
        
        // Generate the search url
        // offset tells how far to page
        self.createSearchURL = function(_query, _offset) {
            // Double the max_search_results to assist with paging
            return settings.SEARCH_PATH +"?bookids="+ settings.BOOK_ID +"&query="+ _query +"&startat="+ (_offset || 0) +"&maxresults="+ settings.SEARCH_MAX_RESULTS +"&format=jsonp&callback=?";
        };
        
        self.nextResults = function() {
            if( offset+settings.SEARCH_MAX_RESULTS < total_results ) {
                $("#search ul li:not(:eq(0))").remove();
                offset += settings.SEARCH_MAX_RESULTS;
                self.search();
            }
        };
        
        self.prevResults = function() {
            if( offset > 0 ) {
                $("#search ul li:not(:eq(0))").remove();
                offset -= settings.SEARCH_MAX_RESULTS;
                self.search();
            }
        };

        self.clear = function() {
            $("#search .query").text( query );
            $("#search").addClass("off");
            $("#search ul li:not(:eq(0))").remove();
            $("#search ul span.resultswrapper").hide();
            $("#search ul span.noresults").show();
        };

        self.search = function() {
            app.reader.showSection("search");
            $("#search").addClass("loading"); 
            app.core.load("jsonp", self.createSearchURL(query, offset), function(data) {
                $("#search span.resultswrapper").show();
                $("#search span.noresults").hide();
                $("#search span.query").text( query );
                $("#search").removeClass("off").removeClass("loading");
                var dataObj = app.core.utils.stringToXml(data["results"]), hit, title, snippets;
                var count = dataObj.getElementsByTagName("hit").length;
                total_results = parseInt(dataObj.getElementsByTagName("results")[0].getAttribute("hits"));
                
                if(count > 0) {
                        // Show total results
                        $("#search span.resultsnum").text( offset +"-"+ (offset+count) +" of "+ total_results ); 
                }
                
                // Normalize to 10 if > than
                for(var i = 0, len = count; i < len; i++) {
                    hit = dataObj.getElementsByTagName("hit")[i];
                    title = hit.getElementsByTagName("title")[0].textContent;
                    snippets = hit.getElementsByTagName("snippets")[0].textContent.replace(/\n/g, " ");
                     
                    var anchor = $("<a/>").attr("data-page", hit.getAttribute("pageid")).attr("rel", "goto-search").attr("href", "#");
                    anchor.html( title );
                    var li = $("<li/>");
                    li.append(anchor).append("<div class='chapterlabel'>"+ snippets +"</div>");
                    $("#search").find("ul").append(li);
                }

                // No results
                if(!dataObj.getElementsByTagName("hit").length) {
                    $("#search").find("ul").append("<li>No results found</li>");
                }
                else {
                    $('#search .root-menu a:only-child').bind('click', app.tools.menuHandler);
                }
            });
        };

        self.getQuery = function() {
            return query;
        };
    
        return self;
    }({});
})(this, this.document, jQuery);
