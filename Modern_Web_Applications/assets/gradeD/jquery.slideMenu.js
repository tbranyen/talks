/*
    About: jquery.slideMenu.js
    SlideMenu is a desktop/mobile menu system that utilizes CSS3 and Modernizr to provide a
    native feeling effect to iPhone/Android/Blackberry devices.
*/
(function(window, document, $) {
    /*
        Function: slideMenu

        Only accepts <UL> elements with a predefined nested structure.  Iterates over each
        root menu and applies proper styling, and attaches a surfaceToTop function on the data
        object for each root menu <UL>.

        Parameters:
            _config - (optional) Contains references to dive/surface callback functions.

        Returns:
            jQuery object of only the <UL>'s converted to menus.
    */
    $.fn.slideMenu = function(_config) {
        var settings = _config;
        return this.each(function() {
            // Constants caching
            var $this = $(this),
                has_css3 = window.Modernizr.cssanimations;
            // Ensure only UL's are used
            if(!$this.is("ul")) { return; }
            // Li to determine which menu we are currently in
            var token;
            /*
                Function: dive
             
                Slides current menu out of view and takes the nested <UL> menu and slides it into view
                if the device is not capable of CSS3 transitions, a quick display toggle will trigger.
             
                Parameters:
                    elem - A menu <LI> that has been clicked, used to display menu and has the
                    parent menu stored in the token variable.
            */
            function dive(elem) {
                token = elem.parent();
                var menu = token.children("ul");
                 
                if( has_css3 ) {
                    elem.closest("ul").css("-webkit-transform", "translate(-100%)");
                    menu.show().css("-webkit-transform", "translate(0%)");
                }
                else {
                    elem.closest("ul").css("left", function() {
                        return ( (parseFloat($(this).css('left')) || 0) - 100 ) +"%";
                    });
                    
                    menu.css({
                        'display': 'block',
                        'left': function() {
                            return ( (parseFloat($(this).css('left')) || 0) + 100 ) +"%";
                        }
                    });
                }
                
                (settings.diveCallback || $.noop).call($this, menu);
            }
            
            /*
                Function: surface
             
                Slides current menu out of view and takes the parent menu and slides it into view
                if the device is not capable of CSS3 transitions, a quick display toggle will trigger.
            */
            function surface() {
                var menu = token.children("ul");

                if( has_css3 ) {
                    token.parent().css("-webkit-transform", "translate(0%)");
                    menu.css("-webkit-transform", "translate(100%)");
                }
                else {
                    token.parent().css("left", function() {
                            return ( (parseFloat($(this).css('left')) || 0) + 100 ) +"%";
                    });
                    menu.css("left", function() {
                        return ( (parseFloat($this.css('left')) || 0) - 100 ) +"%";
                    });
                    menu.hide();
                }
                
                token = token.parents("li");
                (settings.surfaceCallback || $.noop).call($this, menu);
            }
            
            /*
                Function: surfaceToTop
                
                Is unique per menu to allow specific surfacing.  Continues to trigger the surface 
                Function until the menu has been completely reset.
            */
            $this.data("surfaceToTop", function() {
                while (token.parents('ul').length) { surface(); }
            });
            
            // Set the initial styles here
            $this.css("position", "relative");
            
            // Find each menu
            $this.find("ul")
                .css({
                    'top': "0px",
                    'position': "absolute"
                })
                .css("left", function() {
                    if( has_css3 ) {
                        return "100%";
                    }
                    else {
                        return "0%";
                    }
                });
            
            // Handle parent menu click
            $this.find('ul').prevAll('a')
                .each(function() {
                    $(this).closest('li').addClass('arrow');
                })
                .bind("click", function(evt) {
                    dive( $(this) );
                })
                .bind('touchstart', function (evt) {
                    $(this).closest('div.content').find('li.tocimg.selected').removeClass('selected');
                    $(this).parent().addClass('selected');
                })
                .bind('touchend', function (evt) {
                    $(this).parent().removeClass('selected');
                });
            
            // Handle the surfacing
            $this.parents("div.window").find(".return").bind("click", function(evt) {
                if( !!token && token.length ) {
                    surface();
                }
                else {
                    token = undefined;
                    $(window).trigger("hashchange");
                }
                
                return false;
            });
        });
    };
    
})(this, this.document, this.jQuery);
