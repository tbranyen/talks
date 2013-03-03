// Namespace: app
// Module: image
// Handles the image viewer logic
(function(window, document, $, undefined) {
  // Namespace: APP
  var app = window.app = window.app || {};
  // Module: Image
  app.image = function(self) {
    
    var settings = app.settings = app.settings || {};
    
    var win = $(window),
        book_viewer = $("#book-viewer"),
        book_content = book_viewer.find("div.content"),
        image_viewer = $("#image-viewer"),
        image_content = image_viewer.find("div.content");

    self.init = function() {
      var minScale,
          maxScale = 2;
          
      var screenWidth,
          screenHeight;

      var // Updated every touchmove
          startX = 0,
          startY = 0,
          curX = 0,
          curY = 0,
          oldScale,
          curScale,
          scaleDiff,
          imgStyle,
          matrix,
          $imgHandle;
      
      // Checks if the value is between two values 
      function range(min, max, val) {
        return Math.max(min, Math.min(val, max));
      }

      function toggleZoom(evt) {
        // FIXME: xnew = new_width * xold / original_width; ynew = new_height * yold/original_height;
        if (minScale != 1) {
          matrix.a = matrix.d = (matrix.a == minScale) ? 1 : minScale;
        } else {
          matrix.a = matrix.d = (matrix.a == 1) ? 2 : 1;
        }
        
        imgStyle.webkitTransform = matrix;
        
        return app.core.utils.stopEvent(evt);
      };
      
      image_viewer.find("a.zoom").bind("click", toggleZoom);
      
      // pan image listeners
      image_content.bind("touchstart", function(evt) {
        var targetTouches = evt.targetTouches[0];
        startX = targetTouches.pageX;
        startY = targetTouches.pageY;

        $imgHandle = $(this).find("img");
        imgStyle = $imgHandle[0].style;
        
        return app.core.utils.stopEvent(evt);
      });
      
      image_content.bind("touchmove", function(evt) {
        var targetTouches = evt.targetTouches[0];
        curX = targetTouches.pageX - startX;
        curY = targetTouches.pageY - startY;
        startX = targetTouches.pageX;
        startY = targetTouches.pageY;

        var imageWidth = $imgHandle.width();

        //var newmatrix = matrix.translate(curX *(1/matrix.a), curY *(1/matrix.d));
        //var newWidth = imageWidth * newmatrix.a;
        //
        //var rightEdge = (screenWidth / 2) + newmatrix.e + (newWidth / 2);
        //  if (rightEdge < screenWidth && newmatrix.e < matrix.e) {
        //    newmatrix.e = matrix.e;
        //}
        
        // bind images to within screen space
        matrix = matrix.translate(curX *(1/matrix.a), curY *(1/matrix.d));
        var newWidth = imageWidth * matrix.a;
        var imageWidth = $imgHandle.width();
        var newWidth = imageWidth * matrix.a;
        var diffWidth = newWidth - imageWidth;
        var xMin, xMax;
        var screenWidth = $(this).width();
        
        //if (matrix.a <= 1) {
        //  xMin = 0 + diffWidth / 2;
        //  xMax = $(this ).width() + (diffWidth/2) - newWidth;
        //} else {
        //  if (newWidth >  screenWidth) {
        //    xMin = screenWidth - newWidth;
        //    xMax = xMin * -1;
        //  } else {
        //    xMin = 0 - diffWidth / 2;
        //    xMax = $(this).width() - diffWidth / 2;
        //  }
        //}
        
        xMin = 0 - imageWidth + 60;
        xMax = screenWidth - 60;
        
        matrix.e = range( xMin, xMax, matrix.e );
        matrix.f = range( parseInt(-$imgHandle.height())+60, parseInt($(this).height())-100, matrix.f );
        imgStyle.webkitTransform = matrix //= newmatrix;
      });
      
      // pinch zoom listeners
      image_content[0].addEventListener("gesturestart", function(evt) {
        $imgHandle = $(this).find("img");
        imgStyle = $imgHandle[0].style;
      }, false);
      
      image_content[0].addEventListener("gesturechange", function(evt) {
        var newScale = range(minScale, maxScale, oldScale * evt.scale);
        matrix.a = matrix.d = newScale;
        imgStyle.webkitTransform = matrix;
        
        return app.core.utils.stopEvent(evt);
      }, false);
      
      image_content[0].addEventListener("gestureend", function(evt) {
        oldScale = matrix.a;
      }, false);
      
      // Attach click to all images in book body
      book_content.find("img:not(.return)").live("click", function(evt) {
        //Modernizr.events["touchstart"] = true;
        if(Modernizr.events["touchstart"]) {
          app.core.load("image", this.getAttribute("src"));
          app.reader.showSection("image-viewer");
          
          // having trouble getting height of image in order to vertically center
          $('.image-viewer-content').bind('load', function(e) {
            var thisimg = this;
            setTimeout(function() {
              screenWidth = image_content.width();
              screenHeight = image_content.height() - 44;
              minScale = Math.min( screenHeight / thisimg.height, screenWidth / thisimg.width, 1 );
              matrix.a = matrix.d = minScale;
              imgStyle = thisimg.style;
              
              image_content.find('img').css({
                'left': '50%',
                'top': '50%',
                'margin-left': 0 - (thisimg.width / 2),
                'margin-top': 0 - (thisimg.height / 2) + 22
              });
              
              image_content.find('img')[0].style.webkitTransform = matrix;
            }, 0);
          });
          
          // Original width/height
          curX = curY = 0;
          curScale = 1;
          oldScale = 1;
          if (typeof WebKitCSSMatrix === 'object') {
            matrix = new WebKitCSSMatrix();
          }
          return app.core.utils.stopEvent(evt);
        }
        else {
          window.open(this.getAttribute("src"));
        }
      });
      // Return to book
      image_viewer.find("a.return").bind("click", function(evt) {
        win.trigger("hashchange");
        return false;
      });
    }
    return self;
  }({});
})(this, this.document, this.jQuery);
