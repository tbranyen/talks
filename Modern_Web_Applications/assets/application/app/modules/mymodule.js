define([
  // Application.
  "app"
],

// Map dependencies from above array.
function(app) {

  // Create a new module.
  var Mymodule = app.module();

  Mymodule.Views.Header = Backbone.View.extend({
    template: "mymodule/header"
  });

  // Return the module for AMD compliance.
  return Mymodule;

});
