$.deck('.slide');

$(document).on("deck.change", function() {
  $(".deck-container").attr("id", location.hash.slice(1)); 
});

$(".deck-container").attr("id", location.hash.slice(1) || "intro"); 
