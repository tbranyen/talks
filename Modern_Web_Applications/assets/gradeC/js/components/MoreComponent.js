var MoreComponent = function( global, $ ) { 
  bc.core.extendClass( MoreComponent, Component );
  
  function MoreComponent( element ) {
    this.id = 'more';
    this.parent.apply( MoreComponent, [this, element] );

    this.originalHTML = this.element.html();
  }

  MoreComponent.prototype.views = {

    'list': {
      template: 'components/more/list',
      render: function( tmpl, element ) {
        var that = this;

        that.element.html( tmpl );

        bc.ui.enableScrollers();
      }
    }

  };

  MoreComponent.prototype.init = function() {
    // Set the view
    this.view = this.element.data( 'view' );

    // Set the page
    this.page = global.location.hash ? global.location.hash : null;

    // Transition to the correct page
    if( this.page ) {
      this.view = this.page.slice( 1 );
      this.element.attr( 'data-view', this.view );
    }

    this.render();
    if( !this.hasInit ) {
      this.hasInit = true;
      this.registerEventListeners();
    }
  }; 
  MoreComponent.prototype.registerEventListeners = function() {
    var that = this;

    $( document ).delegate( '.send-feedback', 'click', function( evt ) {
      global.location.href = [
        'mailto:contact@freedom.com?',
        'from=user@useremailaddress.com?',
        'subject=[Sent from Freedom App]?',
        'body=[Sent from Freedom App]'].join();

      return false;
    });

    $( document ).delegate( '.back', 'click', function( evt ) {
      bc.ui.backPage({ transitionType: bc.ui.transitions.SLIDE_RIGHT });
    });

    $( document ).delegate( '.video-menu', 'click', function( evt ) {
      var videoPage = $( '#video-page' );

      bc.components.video.setView( 'videos' );

      bc.ui.forwardPage( videoPage );
    });

    $( document ).delegate( '.photos-menu', 'click', function( evt ) {
      var photosPage = $( '#photos-page' );

      bc.components.photos.setView( 'galleries' );

      bc.ui.forwardPage( photosPage );
    });
  };
  
  return MoreComponent;
}( this, this.jQuery );
