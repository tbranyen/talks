// Clear plugin
(function($) {
	// This is the object to clear
	$.fn.clear = function(who, not, when, what) {
		var that = this;
		// Bind to each selector
		$(who).each(function(i,e) {
			// Default to click
			e = (e === "document") ? document : e;
			$(e).bind((when || "click"), function(evt) {
				if(typeof what === "function") {
					what.apply(that, arguments);
				}
				else {
					that.hide();
				}
			});
		});
 
		// Prevent the object from closing
		$(not).bind(when || "click", function(evt) {
			evt.stopPropagation();
		});
	}
})(jQuery);