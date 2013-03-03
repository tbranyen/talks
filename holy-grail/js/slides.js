require.config({
  shim: {
    "slide-deck": [
      "../slide_config",
      "modernizr.custom.45394",
      "prettify/prettify",
      "hammer"
    ],

    "slide-controller": ["slide-deck"]
  }
});

require(["slide-controller"]);
