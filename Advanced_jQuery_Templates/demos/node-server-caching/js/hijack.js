(function(window, $) {
    var _history = window.history;

    // Ajax either template or context
    function fetch(type, href, callback) {
        $.ajax({
            url: '/fetch/'+ type +'/'+ encodeURIComponent(href),
            success: function(data) {
                callback && callback(data);
            }
        });
    }

    // Hijack plugin
    $.fn.hijack = function(render) {
        var rendered;
        return this.each(function() {
            var link = $(this);
            link.bind('click', function(evt) {
                var href = link.attr('href');

                // Fetch the respective template/context
                fetch('template', href, function(template) {
                    fetch('context', href, function(context) {
                        // Augment the context with the current href
                        context.href = href;

                        // Change the address location
                        _history.pushState({ 
                            href: href, template: template, context: context }, context.title, href);

                        // Trigger render method
                        render && render(template, context);
                    });
                });

                // Disable the click
                return false;
            });
        });
    };
})(this, this.jQuery);
