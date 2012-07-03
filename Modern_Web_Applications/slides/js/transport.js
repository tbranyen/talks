// Deck initialization
$.deck('.slide');

$(document).on("deck.change", function() {
  console.log("here");
});

$(window).on("hashchange.deckhash", function() {
  console.log(location.hash);
});
