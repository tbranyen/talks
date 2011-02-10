jQuery(function($) {
    // Predetermined placeholders
    var header = $("header > h1")
      , section = $("section");

    // Keep originals
    var _header = header.clone()
      , _section = section.clone()
      , _title = document.title;

    // Resuable render method
    function render(template, context) {
        // Set title
        console.log(context);
        document.title = context.title;
        _header.html(context.title);

        // Render page content
        var rendered = $.tmpl(template, context);
        _section.html(rendered);
    }

    // Handle when history changes
    window.onpopstate = function(evt) {
        var state = evt.state;
        
        // Pulled from cache
        if(state && state.href) {
            render(state.template, state.context);
        }
        // Original page
        else {
            header.replaceWith(_header);
            section.replaceWith(_section);
            document.title = _title;
        }

        return false;
    };
     
    // Hijack all links
    $("a").hijack(function(template, context) {
        render(template, context);
    });
});
