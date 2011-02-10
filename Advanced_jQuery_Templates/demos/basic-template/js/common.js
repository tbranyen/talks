jQuery(function($) {
    var header = $("header > h1"),
        section = $("section");
      
    // Hijack all links
    $("a").hijack(function(template, context) {
        // Set title
        document.title = context.title;
        header.html(context.title);

        // Render page content
        var rendered = $.tmpl(template, context);
        section.html(rendered);
    }, true);
});
