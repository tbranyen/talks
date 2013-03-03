define([
  // Application.
  "app",

  "modules/mymodule"
],

function(app, Mymodule) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "index"
    },

    index: function() {
      app.useLayout("main").setViews({
        "header": new Mymodule.Views.Header()
      }).render();
    }
  });

  return Router;

});
