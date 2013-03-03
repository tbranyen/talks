module.exports = (grunt) ->

  @initConfig
    connect:
      server:
        options:
          port: process.env.PORT || 8000

    sass:
      compile:
        options:
          style: "compressed"
          compass: true

        files:
          "theme/css/default.css": "theme/scss/default.scss",
          "theme/css/phone.css": "theme/scss/phone.scss"

    watch:
      scripts:
        files: ["theme/scss/**/*.scss"]
        tasks: ["sass:compile"]

        options:
          nospawn: false

  @registerTask "open", `function() {
    var port = grunt.config("connect").server.options.port;

    grunt.util.spawn({
      cmd: require("os").platform() === "darwin" ? "open" : "xdg-open",
      args: ["http://localhost:" + port + "/template.html"]
    }, function() {});
  }`

  @loadNpmTasks "grunt-contrib-connect"
  @loadNpmTasks "grunt-contrib-watch"
  @loadNpmTasks "grunt-contrib-sass"

  @registerTask "serve", ["open", "connect:server", "watch"]
