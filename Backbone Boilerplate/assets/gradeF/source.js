// vim:ts=4 480 680
// Explicit closure
(function(window, undefined) {
    // Explicit globals
    window.onMarketersFetched = null;
    window.onMarketersEvaluated = null;

    // App namespace
    window.app = function() {
        // Instantiate private properties
        var percent = 0, 								// The current loading percentage, stored as an integer.
			loggedin = {}, 								// A reference to a marketer object representing the currently logged in marketer.
			map = [], 									// The entire downline stored as marketer objects with nested positioning.
			index = {}, 								// Used to search a downline and also for quickly retrieving a reference to a marketer.
			close = {}, 								// Cached results of who is close to a rank, in actuality this stores people who have obtained a rank.
			ranks = [], 								// An array containing a Rank object which describes each potential rank.
			requirements = [], 							// All the potential requirements corresponding with a RankID.
			cachedRequest = { unilevel: [], cgv: [] },  // An object that caches the requirements for a given rank.
			myinfo = [], 								// An object containing information about the logged in marketer displayed in the top left column box.
			root = null, 								// A marketer object describing the marketer selected through the left column Find a marketer drop downs.
			selected = null, 							// A marketer object describing the currently selected marketer (in the middle column).
			state = {}, 								// A collection of objects that describe how the current tool display should look.
			progressInterval = null, 					// Interval used while pulling the downline, the stored procedure could take a while, this will simulate progress.
			fourth = null, 								// Timeout used to delay the hover 4th column.
			searchTimer = null, 						// Used for searching this is a small buffer to complement the delay with typing a name.
			idleTimeout = null, 						// A timeout used to alert the end user their session will be expiring soon.
			breadcrumbs = [], 							// This is the parent trail that follows scrolling.
			width = 132, 								// A constant width for CV/CGV bars.
			colors = [ "green", "yellow", "red" ], 		// Used when iterating over box item's class attribute to determine their color.
			contextWindow = null,                       // Whomever added this fill in comment
            context = this,                             // Application context
            initProcess= null;                          // Process taken to calculate goal
            

        // An idle timeout to warn the end user
        function keepAlive() {
            idleTimeout = window.setInterval(function() {
                jQuery.ajax({
                    type: "GET",
                    url: "KeepAlive.aspx?" + (+new Date())
                });
            }, 300000); // 5 mins
        }

        // Redirect the marketer back to the Login page
        function redirectToLogin() {
            if (window.opener) {
                window.opener.window.open("Login.aspx?redirect=GoalApplication.aspx", "_self");
                self.close();
            }
            else {
                window.open("Login.aspx?redirect=GoalApplication.aspx", "_self");
            }
        }

        // Events to assist with using Telerik controls
        function telerikHelpers() {
            // When rad combo box items load
            jQuery("#goal_Input, #ranks_Input, #searchGoal_Input, #ranksGoal_Input").each(function() {
                jQuery("<span class='rcbInput'>" + jQuery(this).val() + "</span>").insertAfter(jQuery(this));
            });

            // When rad combo box items change
            jQuery("#goal_Input, #ranks_Input, #searchGoal_Input, #ranksGoal_Input").change(function() {
                jQuery(this).parent().find("span").html(jQuery(this).val());
            });

            // Searching by name, search box keyup.
            jQuery("#searchName_Input").keyup(function(evt) {
                var k = evt.keyCode;
                // Do not extend the timeout for arrow keys
                if (!(k >= 37 && k <= 40)) {
                    window.clearTimeout(searchTimer);
                    searchTimer = window.setTimeout((function() {
                        redundant();
                    }), 500);
                }

                // Enter pressed
                if (k === 13) {
                    window.clearTimeout(searchTimer);
                    jQuery("#searchName_DropDown").hide();
                }
            });

            // Clear message
            jQuery("#searchName_Input").focus(function(evt) {
                window.clearTimeout(searchTimer);
                jQuery(this).val((jQuery(this).val() == this.defaultValue) ? "" : jQuery(this).val());
            });

            // Default message
            jQuery("#searchName_Input").blur(function() {
                window.clearTimeout(searchTimer);
                jQuery(this).val((jQuery(this).val() === "") ? this.defaultValue : jQuery(this).val());
            });
        }

        // Binds click events to all go buttons
        function bindGoButtons() {
            // This is the button after they select a goal
            jQuery("#goButton").click(function(evt) {
                var dropdown = $find("goal");
                if (dropdown.get_selectedIndex() !== 0 && jQuery("#goal").find(".rcbInput").text() !== "Choose a Pin Level Goal") {
                    var rank = dropdown.get_value();
                    root = loggedin;
                    root.desiredRank = rank;
                    root.calcCGV();

                    // Put tool at some defaults
                    goButtonClicked.call(this, evt, [rank]);
                    
                    // Does it all function!
                    tempUpdateFunction(root);
                    jQuery("#buttons > .last").show();
                }

                return false;
            });

            // This is the button after they select a connector and rank
            jQuery("#goConnectorButton").click(function(evt) {
                var ranksName = $find("ranksName"),
                    ranksGoal = $find("ranksGoal");

                if (ranksGoal.get_selectedIndex() !== 0) {
                    var marketer = null;
                    if (ranksName.get_value() !== "")
                        marketer = findMarketer(ranksName.get_value());

                    // Put tool at some defaults
                    goButtonClicked.call(this, evt, [$find("ranks").get_value(), $find("ranksName").get_value(), $find("ranksGoal").get_value()]);

                    var rank = $find("ranksGoal").get_value();
                    root = marketer;
                    root.desiredRank = rank;
                    root.calcCGV();

                    // Does it all function!
                    tempUpdateFunction(root);
                    jQuery("#buttons > .last").show();
                }

                return false;
            });

            // This is the button after they search for a marketer
            jQuery("#goSearchButton").click(function(evt) {
                var searchName = $find("searchName"),
                    searchGoal = $find("searchGoal");

                if (searchGoal.get_selectedIndex() !== 0) {
                    var marketer = findMarketer(searchName.get_value());

                    if (typeof marketer !== "undefined")
                        root = marketer;

                    // Put tool at some defaults
                    goButtonClicked.call(this, evt, [$find("searchName").get_value(), $find("searchGoal").get_value()]);

                    var rank = searchGoal.get_value();
                    root = marketer;
                    root.desiredRank = rank;
                    root.calcCGV();

                    // Does it all function!
                    tempUpdateFunction(root);
                    jQuery("#buttons > .last").show();
                }

                return false;
            });
        }



        // Attach all live events
        function bindLiveEvents() {
            // Delete button
            jQuery(".dlt-file").live("click", function() {
                var $li = jQuery(this).parents("li");
                var name = jQuery(this).parents("li").contents(":not(*)")[0].data;

                // Make ajax call
                jQuery.ajax({
                    type: "GET",
                    async: true,
                    contentType: "application/json; charset=utf-8",
                    url: "services/MarketerServices.asmx/DeleteState?_NAME=" + name,
                    dataType: "text",
                    error: function(xhr) {
                        if (xhr.responseText.indexOf("logged_out") > -1)
                            redirectToLogin();
                    },
                    success: function(json) {
                        $li.remove();
                    }
                });
            });

            // Run the save function on click
            jQuery("#saveBtn").live("click", function() {
                if (jQuery("#saveName").val().length) {
                    save(jQuery("#saveName").val());
                }
            });

            // Open url in modal popup
            jQuery("a[name=mymodal]").live("click", function(e) {

                //Cancel the link behavior
                e.preventDefault();

                //Get the A tag
                //var id = jQuery("a[name=mymodal]").attr('id');
                var id = jQuery(this).attr('id');
                var contentHeight = jQuery(this).attr('height');
                var contentWidth = jQuery(this).attr('width');
                var url = jQuery(this).attr('href');
                var title = jQuery(this).attr('title');
                //Get the screen height and width
                var maskHeight = jQuery(document).height();
                var maskWidth = jQuery(document).width();

                if (contentHeight != 'undefined' && contentWidth != 'undefined' && url != 'undefined' && title != 'undefined') {

                    jQuery('#ifcontent').show();
                    jQuery('#ifcontent').attr('height', contentHeight);
                    jQuery('#ifcontent').attr('src', url);
                    jQuery('.windowheadertitle').text(title);
                }
                //Set heigth and width to mask to fill up the whole screen
                jQuery('#mask').css({ 'width': maskWidth, 'height': maskHeight });

                //transition effect
                jQuery('#mask').fadeIn(1000);
                jQuery('#mask').fadeTo("slow", 0.8);

                //Get the window height and width
                var winH = jQuery(window).height();
                var winW = jQuery(window).width();

                //Set the popup window to center
                jQuery(id).css('top', (winH / 2 - jQuery(id).height() / 2) + jQuery(window).scrollTop());
                jQuery(id).css('left', winW / 2 - jQuery(id).width() / 2);

                //transition effect
                jQuery(id).fadeIn(2000);

                //});

                //if close button is clicked
                jQuery('.window .close').click(function(e) {
                    //Cancel the link behavior
                    e.preventDefault();

                    jQuery('#mask').hide();
                    jQuery('.window').hide();
                });

            });

            //if mask is clicked
            jQuery('#mask').click(function() {
                jQuery(this).hide();
                jQuery('.window').hide();
            });

            jQuery('.windowclosebutton').click(function(e) {
                e.preventDefault();
                var contentHeight = jQuery(this).attr('height');
                var contentWidth = jQuery(this).attr('width');
                var url = jQuery(this).attr('href');
                var title = jQuery(this).attr('title');
                if (contentHeight != 'undefined' && contentWidth != 'undefined' && url != 'undefined' && title != 'undefined') {
                    jQuery('#ifcontent').hide();
                    jQuery('#ifcontent').attr('src', '');
                    jQuery('.windowheadertitle').text('');
                }
                jQuery('#mask').hide();
                jQuery('.window').hide();
            });

            // Send email
            jQuery("#sendEmailBtn").live("click", function(evt) {
                // Fill FROM email addresses
                getEmailAddresses(loggedin.AccountID, function(emails) {
                    window.setTimeout(function() {

                        var dropdown = $find("inpFrom");
                        dropdown.clearItems();
                        for (var i = 0; i < emails.length; i++) {
                            var item = new Telerik.Web.UI.RadComboBoxItem();
                            item.set_text(loggedin.AccountName + " (" + emails[i].Address + ")");
                            item.set_value(loggedin.UniqueAccountID);
                            dropdown.trackChanges();
                            dropdown.get_items().add(item);
                        }
                        dropdown.get_items().getItem(0).select();
                        dropdown.commitChanges();
                    }, 300);
                });

                // Fill TO email addresses
                getEmailAddresses(selected.AccountID, function(emails) {
                    window.setTimeout(function() {

                        var dropdown = $find("inpTo");
                        dropdown.clearItems();
                        for (var i = 0; i < emails.length; i++) {
                            var item = new Telerik.Web.UI.RadComboBoxItem();
                            item.set_text(selected.AccountName + " (" + emails[i].Address + ")");
                            item.set_value(selected.UniqueAccountID);
                            dropdown.trackChanges();
                            dropdown.get_items().add(item);
                        }
                        dropdown.get_items().getItem(0).select();
                        dropdown.commitChanges();

                        jQuery("#message").val("Hello " + convertNameToFirstLast(selected.AccountName) + ",");
                    }, 300);
                });
            });

            // Send a direct email
            jQuery("#sendDirectMail").live("click", function() {
                var val = { "to": jQuery("#inpTo_Input").val(), "from": jQuery("#inpFrom_Input").val() },
					to = val["to"].substring(val["to"].indexOf("(") + 1, val["to"].lastIndexOf(")")),
					from = val["from"].substring(val["from"].indexOf("(") + 1, val["from"].lastIndexOf(")")),
					message = { _TO: to, _FROM: from, _SUBJECT: jQuery("#inpSubject").val(), _BODY: jQuery("#message").val() },
					that = this;

                jQuery.ajax({
                    type: "GET",
                    async: false,
                    contentType: "application/json; charset=utf-8",
                    url: "services/MarketerServices.asmx/SendDirectEmail?" + jQuery.param(message),
                    dataType: "text",
                    error: function(xhr) {
                        if (xhr.responseText.indexOf("logged_out") > -1)
                            redirectToLogin();
                    },
                    success: function(json) {
                        var result = {};
                        result = stringToObject(json);

                        // Error checking
                        if (result.error === "false")
                            jQuery(that).parents(".ModalWrap").find(".ModalClose").trigger("click");
                        else
                            parent.focus();
                    }
                });
            });
            // Close the goals summary
            jQuery("#closeGoalsBtn").live("click", function() {
                jQuery("#goalsSummary").hide();
                return false;
            });

            // Add new marketer button
            jQuery("#addMarketerBtn").live("click", function() {
                var win = window.open("RedirectToUIX.aspx?url=/Account/AddAccount.aspx", "_blank");
                win.focus();

                return false;
            });

            // show the goals summary
            jQuery("#showGoalsSummaryBtn").live("click", function() {
                jQuery("#profileSettings").hide();
                var requirements = findRankRequirements(root.desiredRank);
                var rankList = generateRequiredRanksList(root);
                var requiredCgv = parseFloat(findCGVRequirement(root.desiredRank));

                var requiredRanks = "";
                var condense = { "name": "", "total": 0 };
                for (var i = 0; i < rankList.length; i++) {
                    if (condense.name === "") {
                        condense.name = translateRank(rankList[i]);
                        continue;
                    }
                    else if (condense.name === translateRank(rankList[i])) {
                        condense.name = translateRank(rankList[i]);
                        condense.total = condense.total + 1;
                        continue;
                    }
                    else {
                        if (condense.total > 1) {
                            requiredRanks += condense.total + " " + condense.name.replace(" Director", "") + "s" + "<br />";
                        }
                        else {
                            requiredRanks += condense.total + " " + condense.name.replace(" Director", "") + "<br />";
                        }
                        condense.name = translateRank(rankList[i]);
                    }

                    condense.total = 1;
                }

                if (condense.total > 1)
                    requiredRanks += condense.total + " " + condense.name.replace(" Director", "") + "s" + "<br />";
                else
                    requiredRanks += condense.total + " " + condense.name.replace(" Director", "") + "<br />";

                // Normalize unilevel requirement
                var unilevelRequirement = (findUnilevelRequirement(root.desiredRank).unilevel !== null) ?
												findUnilevelRequirement(root.desiredRank).unilevel.match(/\d+/)[0] :
												1;

                // Normalize cgv
                if (isNaN(requiredCgv)) {
                    requiredCgv = requirements["TotalComVol"];
                }

                jQuery("#goalsSummary #goalTitle .goal").html(modifyStarRank(translateRank(root.desiredRank)));
                jQuery("#goalsSummary #totalCV .goal").html(formatComma(requirements["QualVol"]));
                jQuery("#goalsSummary #totalCGV .goal").html(formatComma(requiredCgv));
                jQuery("#goalsSummary #unilevels .goal").html(unilevelRequirement);
                jQuery("#goalsSummary #paidPlatinum").hide();
                jQuery("#goalsSummary #legStructure .goal").html(requiredRanks);

                jQuery("#goalsSummary").show();

                return false;
            });

            // Expand marketer
            jQuery(".column.midCol div.boxItem:not(.bottom)").live("click", function() {
                var color = getColorFromClass(jQuery(this)),
					marketer = findMarketer(jQuery(this).attr("id").substr(2)),
					$this = jQuery(this);

                var trigger = false;
                if (!$this.find(".lock").is(".pinned")) {
                    $this.find(".lock").trigger("click");
                    trigger = true;
                }
                selected = marketer;
                updateMiddleColumn(breadcrumbs[breadcrumbs.length - 1], marketer, color);
                scroll();

                if (trigger) {
                    jQuery(".yourGoalsMarker").find(".lock").trigger("click");
                }
            });

            // View profile
            jQuery(".profileBtn").live("click", function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                jQuery("#profileSettings").hide();
                jQuery("#goalsSummary").hide();

                var marketer = undefined;
                if (jQuery(this).parents("#mainDetails").length > 0) {
                    marketer = root;
                }
                else {
                    marketer = findMarketer(jQuery(this).parents(".yourGoalsMarker, .boxItem").attr("id").substr(2));
                }
                if (typeof marketer === "undefined") {
                    marketer = selected;
                }
                var details = getProfileContactDetails(marketer.AccountID);
                var list = getProfileList(marketer.AccountID);

                // Do the list first
                jQuery("#profileSettings ul").html("");

                jQuery("#profileSettings ul").append(jQuery("<li class='header'>Details For " + map[0].ComPerStartDate + "</li>"));

                var i = 0, len = list.length; while (i < len) {
                    if (list[i].FormatCode == "H") {
                        if (list[i].Url != "") {
                            if (list[i].OpenInNewWindow == true) {
                                jQuery("#profileSettings ul").append(jQuery("<li class='header'>" + list[i].Label + "  " + list[i].Value + "<a target='_blank' href='" + list[i].Url + "' title='" + list[i].Title + "'><img style='float:right;' src='includes/images/goalplanner/info_button.png' alt='More info' style='border: none' /></a></li>"));
                            }
                            else {
                                jQuery("#profileSettings ul").append(jQuery("<li class='header'>" + list[i].Label + "  " + list[i].Value + "<a href=" + list[i].Url + "?account=" + marketer.AccountID + " id='#global' name='mymodal' height='" + list[i].Height + "' width='525' title='" + list[i].Title + "'><img style='float:right;' src='includes/images/goalplanner/info_button.png' alt='More info' style='border: none' /></a></li>"));
                            }
                        }
                        else {
                            jQuery("#profileSettings ul").append(jQuery("<li class='header'>" + list[i].Label + "  " + list[i].Value + "</li>"));
                        }
                    }
                    else if (list[i].FormatCode == "I") {
                        jQuery("#profileSettings ul").append(jQuery("<li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + list[i].Label + " : " + list[i].Value + "<img src='includes/images/goalplanner/info_button.png' alt='More info' style='border: none' /></li>"));
                    }
                    else {
                        if (list[i].Url != "") {
                            if (list[i].OpenInNewWindow == true) {
                                if (list[i].Label == "Current Annual CV") {
                                    jQuery("#profileSettings ul").append(jQuery("<li><div style='width:111px;display:inline-table;'>" + list[i].Label + ":</div> " + list[i].Value + "<a target='_blank' href=" + list[i].Url + " title='" + list[i].Title + "'><img style='float:right;' src='includes/images/goalplanner/act_btn.gif' alt='More info' style='border: none' /></a></li>"));
                                }
                                else {
                                    jQuery("#profileSettings ul").append(jQuery("<li><div style='width:111px;display:inline-table;'>" + list[i].Label + ":</div> " + list[i].Value + "<a target='_blank' href=" + list[i].Url + "><img style='float:right;' src='includes/images/goalplanner/info_button.png' alt='More info' style='border: none' /></a></li>"));
                                }
                            }
                            else {
                                jQuery("#profileSettings ul").append(jQuery("<li><div style='width:111px;display:inline-table;'>" + list[i].Label + ":</div> " + list[i].Value + "<a href=" + list[i].Url + "?account=" + marketer.AccountID + " id='#global' name='mymodal' height='" + list[i].Height + "' width='525' title='" + list[i].Title + "'><img style='float:right;' src='includes/images/goalplanner/info_button.png' alt='More info' style='border: none' /></a></li>"));
                            }
                        }
                        else {
                            if (list[i].Label != "") {
                                jQuery("#profileSettings ul").append(jQuery("<li><div style='width:111px;display:inline-table;'>" + list[i].Label + ":</div> " + list[i].Value + "</li>"));
                            }
                        }
                    }

                    i++;
                }

                // Show the name at the top
                jQuery("#profileSettings .SettingsTop").find("h2").html((details[0].AccountName.length > 21) ? details[0].AccountName.substring(0, 18) + "..." : details[0].AccountName);

                // Display the address above the profile image
                jQuery("#profileSettings .Address").html(details[0].Address1 + "<br />" + ((details[0].Address2.length > 0) ? details[0].Address2 + "<br />" : "") + details[0].City +
					", " + details[0].State + " " + details[0].ZipCode);

                // Now the details
                jQuery("#profileSettings .Contact").html("Day " + formatPhone(details[0].DayPhone) + "<br />Eve " + formatPhone(details[0].EveningPhone) + "<br /><br />MY ACCOUNT I.D. " + marketer.AccountID + "<br />");

                // Show email address
                jQuery("#profileSettings .Email").html("<a href='mailto:" + details[0].EmailAddress + "' style='text-decoration: underline;'>" + details[0].EmailAddress + "</a>");

                // Attach their photo
                jQuery("#profileSettings .ContactWrap").find("img").attr("src", "GenericImageEditor/imagehandler.aspx?id=" + marketer.AccountID).attr("width", "88");

                jQuery("#profileSettings").show();
                jQuery("#profileSettings #close").click(function() {
                    jQuery("#profileSettings").hide();
                });

                return false;
            });

            // Live middle column lock click
            jQuery(".lock").live("click", function(evt) {
                evt.stopPropagation();
                evt.preventDefault();

                // Find position
                var position = jQuery(this).parents(".column").find(".boxItem, .yourGoalsMarker").index(jQuery(this).parent()),
					marketer = jQuery(this).parents(".boxItem, .yourGoalsMarker").attr("id").substr(2),
					col = jQuery(this).parents(".boxItem, .yourGoalsMarker").attr("id").substring(0, 1),
                // Find the parent from either breadcrumbs or root
					parent = null;

                if (breadcrumbs.length > 0)
                    parent = breadcrumbs[breadcrumbs.length - 1].UniqueAccountID;
                else
                    parent = root.UniqueAccountID;

                if (col === "r")
                    parent = selected.UniqueAccountID;

                // Toggle the pin/unpin stuff
                if (jQuery(this).hasClass("pinned")) {
                    var col = jQuery(this).parents(".boxItem, .yourGoalsMarker").attr("id").substring(0, 1);
                    unpin(parent, marketer, col);
                    jQuery(this).removeClass("pinned");
                }
                else {
                    pin(parent, marketer, position);
                    jQuery(this).addClass("pinned");
                    jQuery(this).parents(".boxItem, .yourGoalsMarker").draggable("destroy");
                    jQuery(this).parents(".boxItem, .yourGoalsMarker").droppable("destroy");
                    var currentCss = jQuery(this).parents(".boxItem, .yourGoalsMarker").attr("class");
                    jQuery(this).parents(".boxItem, .yourGoalsMarker").attr("class", (currentCss.replace("ui-draggable", "")).replace("ui-droppable", ""));
                }

                return false;
            });

            // Show the rollover menu
            jQuery("div.triangle").live("click", function(evt) {
                evt.stopPropagation();
                evt.preventDefault();

                // Retrieve references to the current column and marketer box
                var $this = jQuery(this),
					$box = $this.parents(".boxItem, .yourGoalsMarker"),
					$col = $this.parents(".column"),
					colCode = null;

                // Apply the proper box code
                if ($col.hasClass("rightCol"))
                    colCode = "r";
                else if ($box.is(".yourGoalsMarker"))
                    colCode = "";
                else
                    colCode = "m";

                // Check if its overflow 
                var $bottomMenu = null;
                if ($this.parent().hasClass("bottom") && $this.parent().hasClass("middle")) {
                    // Set the bottom menu reference to the middle bottom menu
                    $bottomMenu = jQuery("#bottomMenu");

                    // Assign the ref and col to each rollover menu item
                    $bottomMenu.find("ul li").each(function() {
                        jQuery(this).data("ref", $box[0]);
                        jQuery(this).data("col", colCode);
                    });
                    $bottomMenu.show();
                    $bottomMenu.css("left", $this.offset().left - 152).css("top", jQuery(this).offset().top + 35);
                    $bottomMenu.find("li").draggable({
                        revert: true,
                        helper: 'clone',
                        containment: false,
                        appendTo: '#temp',
                        start: function() {
                            $bottomMenu.hide();
                        }
                    });
                    window.scrollTo(0, $this.offset().top + 35);

                    // Hide the rollover on click
                    jQuery("body").bind("click", function(evt) {
                        jQuery("body").unbind();
                        $bottomMenu.hide();
                    });

                    return false;
                }
                else if (jQuery(this).parent().hasClass("bottom") && jQuery(this).parent().hasClass("right")) {
                    // Set the bottom menu reference to the right bottom menu
                    $bottomMenu = jQuery("#bottomMenuRight");

                    // Assign the ref and col to each rollover menu item
                    $bottomMenu.find("ul li").each(function() {
                        jQuery(this).data("ref", $box[0]);
                        jQuery(this).data("col", colCode);
                    });
                    $bottomMenu.show();
                    $bottomMenu.css("left", jQuery(this).offset().left - 152).css("top", jQuery(this).offset().top + 35);
                    $bottomMenu.find("li").draggable({ revert: true, helper: 'clone', containment: false, appendTo: '#temp', start: function() {
                        $bottomMenu.hide();
                    }
                    });

                    // Hide the rollover on click
                    jQuery("body").bind("click", function(evt) {
                        jQuery("body").unbind();
                        $bottomMenu.hide();
                    });

                    return false;
                }

                var col = jQuery(evt.target).parent().attr("id").substring(0, 1);
                var marketer = findMarketer(jQuery(evt.target).parent().attr("id").substr(2));
                jQuery(this).parent(".boxItem:not(.yourGoalsSummary)").draggable({ revert: true });
                var arrow = jQuery(evt.target);
                var $rolloverMenu = jQuery("#rolloverMenu");

                // Show each person
                $rolloverMenu.remove("li");
                var rolloverHTML = "";

                // Need to update the distance line to be accurate
                // Right column
                if (col === "r")
                    marketer.findDistanceLine(undefined, selected.UniqueAccountID, []);
                else
                    marketer.findDistanceLine(undefined, breadcrumbs[breadcrumbs.length - 1].UniqueAccountID, []);

                var i = marketer.distanceLine.length; while (i--) {
                    var tempMarketer = marketer.distanceLine[i];
                    // Some color corrections
                    if (typeof tempMarketer.color === "undefined")
                        tempMarketer.color = "red";
                    if (closeToRank(tempMarketer, marketer.desiredRank))
                        tempMarketer.color = "yellow";
                    else if (attainedRank(tempMarketer.RankID, marketer.desiredRank))
                        tempMarketer.color = "green";

                    tempMarketer.desiredRank = marketer.desiredRank;
                    tempMarketer.calcCGV();

                    rolloverHTML += "<li id='t_" + tempMarketer.UniqueAccountID + "' class='" + marketer.distanceLine[i].color + " " + col + "'><div class='inner'><span class='Rank'>" + modifyStarRank(translateRank(tempMarketer.RankID)).replace(" Director", "") + "</span><div><img height='35' src='GenericImageEditor/imagehandler.aspx?id=" + tempMarketer.AccountID + "' />" +
									"</div><strong>" + convertNameToFirstLast(tempMarketer.AccountName).substring(0, 12) + "<br />CGV " + formatComma(+tempMarketer.cgv) + "</strong></div></li>";
                }

                $rolloverMenu.find("ul").html(rolloverHTML);

                // Assign the ref and col to each rollover menu item
                $rolloverMenu.find("ul li").each(function() {
                    jQuery(this).data("ref", $box[0]);
                    jQuery(this).data("col", colCode);
                });
                $rolloverMenu.show();

                var rolloverMenuWidth = 0;
                $rolloverMenu.find("li").each(function(i) {
                    rolloverMenuWidth += jQuery(this).outerWidth(true);
                });

                $rolloverMenu.find("ul").css("width", rolloverMenuWidth);
                $rolloverMenu.find("li").css("position", "relative");
                $rolloverMenu.find("li").draggable({ revert: true, helper: 'clone', containment: false, appendTo: '#temp', start: function() { $rolloverMenu.hide(); } });

                $rolloverMenu.css("left", (arrow.offset().left - 352));

                if (col === "r")
                    $rolloverMenu.css("top", (arrow.offset().top - 45));
                else
                    $rolloverMenu.css("top", (arrow.offset().top - 40));

                // Hide the rollover on click
                jQuery("body").bind("click", function(evt) {
                    if (jQuery(evt.target).closest("div.triangle").length === 0 || jQuery(evt.target).parents(".boxItem.bottom").length > 0) {
                        jQuery("body").unbind();
                        $rolloverMenu.hide();
                    }

                    $rolloverMenu.find("ul").css("left", "0px");
                });

                return false;
            });

            jQuery("#states li").live('click', function() {
                if (jQuery(this).hasClass("checked")) {
                    jQuery("#states li").removeClass("checked");
                }
                else {
                    jQuery("#states li").removeClass("checked");
                    jQuery(this).addClass("checked");
                }
            });

            jQuery("#loadBtn").live('click', function() {
                reset();
                if (jQuery("#states li").filter(".checked").length) {
                    jQuery("#states li").each(function() {
                        if (jQuery(this).hasClass("checked")) {
                            // Unpad the state
                            var data = stringToObject(jQuery(this).data("data")),
                                unpad = data.initProcess;
                                
                            state = data;
                            
                            processInit(unpad);

                            // Proper course of action here
                            if (typeof selected !== "undefined") {
                                if (breadcrumbs.length) {
                                    updateMiddleColumn(breadcrumbs[breadcrumbs.length - 1]);
                                }
                                else {
                                    if (selected !== null) {
                                        // Does it all function!
                                        updateRightColumn(root);
                                        jQuery("#buttons .last").show();
                                    }
                                }
                            }
                        }
                    });

                    jQuery(this).parents(".ModalWrap").find(".ModalClose").trigger("click");
                }
                else {
                    // Show error message
                    jQuery(this).parents(".ModalWrap").find(".ModalErrorMessage").html("Please select a file to load.");
                }
            });
        }
        
        // Handles the padding loaded in and hijacks the left menu to show the proper selections
        function processInit(pad) {
            switch(pad.handler) {
                // Simulate goButton path
                case "goButton":
                    var goal = $find("goal")
                        index = null;
                    
                    if(findRankById(loggedin.RankID).RankSeq >= findRankById(pad.steps[0]).RankSeq)
                        index = goal.findItemByValue(loggedin.RankID).get_index();
                    else
                        index = goal.findItemByValue(pad.steps[0]).get_index();
                    
                    goal.get_items().getItem(index).select();
                    goal.commitChanges();
                    goal.raise_selectedIndexChanged();
                    
                    jQuery("#goalEstimationTool ul.tabs li:eq(0)").trigger("click");

                    break;
                // Simulate goConnectorButton path
                case "goConnectorButton":
                    var ranks = $find("ranks"),
                        ranksName = $find("ranksName"),
                        ranksGoal = $find("ranksGoal")
                        index = null,
                        rankID = findMarketer(pad.steps[1]).RankID;
                    
                    // Ranks
                    if(findRankById(rankID).RankSeq >= findRankById(pad.steps[0]).RankSeq)
                        index = ranks.findItemByValue(rankID).get_index();
                    else
                        index = ranks.findItemByValue(pad.steps[0]).get_index();
                    
                    ranks.get_items().getItem(index).select();
                    ranks.commitChanges();
                    ranks.raise_selectedIndexChanged();
                    
                    // RanksName
                    index = ranksName.findItemByValue(pad.steps[1]).get_index();
                    ranksName.get_items().getItem(index).select();
                    ranksName.commitChanges();
                    ranksName.raise_selectedIndexChanged(); 
                    
                    // RanksGoal
                    index = ranksGoal.findItemByValue(pad.steps[2]).get_index();
                    ranksGoal.get_items().getItem(index).select();
                    ranksGoal.commitChanges();
                    ranksGoal.raise_selectedIndexChanged();
                    
                    jQuery("#goalEstimationTool ul.tabs li:eq(0)").trigger("click");
                    
                    break;
                // Simulate goSearchButton path
                case "goSearchButton":
                    var searchName = $find("searchName"),
                        searchGoal = $find("searchGoal"),
                        index = null,
                        rankID = findMarketer(pad.steps[0]).RankID;
                    
                    jQuery("#goalEstimationTool ul.tabs li:eq(1)").trigger("click");
                    // SearchName
                    //if(findRankById(rankID).RankSeq >= findRankById(pad.steps[0]).RankSeq)
                        //index = searchName.findItemByValue(rankID).get_index();
                    //else
                        //index = searchName.findItemByValue(pad.steps[0]).get_index();
                    
                    var $searchNameInput = jQuery("#searchName_Input").val(findMarketer(pad.steps[0]).AccountName).trigger("keyup");
                    window.setTimeout(function() { 
                        searchName.get_items().getItem(0).select();
                        searchName.commitChanges();
                        searchName.raise_selectedIndexChanged();

                        // SearchGoal
                        index = searchGoal.findItemByValue(pad.steps[1]).get_index();
                        searchGoal.get_items().getItem(index).select();
                        searchGoal.commitChanges();
                        searchGoal.raise_selectedIndexChanged();
                        
                        
                        jQuery("#"+pad.handler).trigger("click");
                    }, 1000);
 
                    
                    break;
            }
            
            
        }

        // Update the loading progress bar
        // @msg: Not used - indicates progress status.
        // @complete: Signals application loading complete.
        function updateProgressBar(msg, complete) {
            // Incrementally update the progress bar, or in the case of complete being present, set to 100
            if (typeof complete === "undefined")
                percent += Math.ceil((100 - percent) * .05);
            else
                percent = 100;

            // Update the percent text and show the progress relative to the width (we adjust 6 pixels to keep the bar from breaking)
            jQuery(".LoadingWrap .perc").html(percent + "%");

            // 435px is the full width, 415px is the difference between start and finish.  I calculate the distance to animate by getting the difference of percent.
            jQuery(".LoadingWrap .LoadingBar").stop().animate({ backgroundPosition: "(-" + (435 - (415 * (percent / 100))) + "px 0)" }, 400);
        }

        // Converts string to object
        // @json: A string containing retrieved JSON data.
        function stringToObject(json) {
            // Utilize native parsing for speed or return a function with the literal in it for non-native browsers.
            if (typeof JSON !== "undefined")
                return JSON.parse(json);
            else
                return new Function("return " + json + ";")();
        }

        // Pull the downline information
        // @path: Reference to the webservice path in init()
        function ajaxDownline(path) {
            // .NET webservice - GET is used to cache, app/json used for convention, and datatype returned must be text to internally evaluate the JSON
            jQuery.ajax({
                type: "GET",
                contentType: "application/json; charset=utf-8",
                url: path + "/GetEntities?_ID=" + window.AccountID,
                dataType: "text",

                // An error probably means that the user has been logged out, if this is the case, redirect them.
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },

                // The downline has been downloaded and processed correctly.
                success: function(json) {
                    // Explicit global variables
                    if (window.onMarketersFetched !== null)
                        window.onMarketersFetched();

                    // Assign the map to the jso
                    map = stringToObject(json);

                    // The downline stored procedure has completed, stop the interval.
                    window.clearInterval(progressInterval);
                    updateProgressBar("Retrieving rank requirements information");

                    // Find rank requirements
                    getRankRequirements();

                    // 
                    if (window.onMarketersEvaluated !== null)
                        window.onMarketersEvaluated(map);
                }
            });
        }

        // Rank Search drop down changed
        // @selectedItem: A Telerik item object
        function ranksChanged(selectedItem) {
            if (selectedItem._selectedIndex > 0) {
                var matches = [];
                loggedin.findMarketersNearRank(loggedin.Leg, selectedItem.get_value(), matches);

                var dropdown = $find("ranksName");

                matches.sort(function(a, b) {
                    var aLower = a.AccountName.toLowerCase(),
						bLower = b.AccountName.toLowerCase();
                    return (aLower > bLower) - (bLower > aLower);
                });

                dropdown.clearItems();
                for (var i = 0; i < matches.length; i++) {
                    // Remove overflow accounts
                    if (matches[i].UniqueAccountID.slice(-1) !== "O") {
                        var item = new Telerik.Web.UI.RadComboBoxItem();
                        item.set_text(matches[i].AccountName + " (" + (matches[i].AbsLevel - loggedin.AbsLevel) + ")");
                        item.set_value(matches[i].UniqueAccountID);
                        dropdown.trackChanges();
                        dropdown.get_items().add(item);
                    }
                }
                dropdown.commitChanges();

                if (matches.length > 0) {
                    dropdown.enable();
                    jQuery(".RankError").remove();
                    // fade in changes #ranksName to a block level element
                    // we reset this by changing css back to inline-block			
                    jQuery("#ranksName").show();
                    jQuery("#ranksName").css("display", "inline-block");
                    jQuery("#ranksName_Input").val("Now Select a Marketer");
                    jQuery("#ranksGoal").hide();
                    jQuery("#goConnectorButton").hide();
                }
                else {
                    jQuery(".RankError").remove();
                    jQuery("#ranksName").hide();
                    jQuery("<span class='RankError'>No Marketers Found Close To Selected Rank</span>").insertAfter("#ranksName");
                    dropdown.disable();
                    jQuery("#ranksGoal").hide();
                    jQuery("#goConnectorButton").hide();
                }
            }
        }

        // When the rank search name has changed
        // @selectedItem: A Telerik item object
        function ranksNameChanged(selectedItem) {
            var marketer = findMarketer(selectedItem.get_value());
            var ranksGoal = $find("ranksGoal");
            jQuery("#ranksGoal").show();
            jQuery("#ranksGoal").css("display", "inline-block").css("float", "left");

            buildGoalDropdown(ranksGoal, marketer);

            ranksGoal.get_items().getItem(0).select();
            ranksGoal.commitChanges();
        }

        // Clicked on the search item
        // @selectedItem: A Telerik item object
        function searchClicked(selectedItem) {
            var marketer = findMarketer(selectedItem.get_value());
            if (typeof marketer !== "undefined") {
                var searchGoal = $find("searchGoal");
                searchGoal.set_enabled(true);

                jQuery("#searchGoal").hide();
                jQuery("#searchGoal_Input").next().html("Choose a Pin Level Goal");
                jQuery("#goSearchButton").hide();

                jQuery("#searchGoal").css("display", "inline-block").css("float", "left");

                buildGoalDropdown(searchGoal, marketer);
            }
        }

        // Not sure why this is needed
        function goalChanged() {
        }

        // When the search goal item has changed, fade in
        function searchGoalChanged() {
            jQuery("#goSearchButton").show();
            jQuery("#goSearchButton").css("display", "inline");
        }

        // When the ranks goal item has changed, fade in
        function ranksGoalChanged() {
            jQuery("#goConnectorButton").show();
            jQuery("#goConnectorButton").css("display", "inline");
        }

        // When the search name item has been clicked, remove border
        function searchNameClicked() {
            jQuery("#searchName_DropDown").css("border-width", "0px");
        }

        // Reset the goal planner
        function reset() {
            // Perform various acts with jQuery to hide and reset portions of the goal planner
            jQuery(".rolloverMenu").hide();
            jQuery(".yourGoalsMarker").hide();
            jQuery("#scroller").find(".scrollRight, .scrollLeft").hide();
            jQuery("#detailsEstimation").show();
            jQuery("#mainDetails").hide();
            jQuery("#tabBlackNumber").hide();
            jQuery(".column.midCol *:not(.yourGoalsMarker, .yourGoalsMarker *, #goalsSummary, #goalsSummary *, #profileSettings, #profileSettings *, #tabBlackNumber, #tabBlackNumber *)").remove();
            jQuery("#goalsSummary").hide();
            jQuery("#profileSettings").hide();
            jQuery(".column.rightCol").find(".boxItem, .no-further").remove();
            jQuery("#goConnectorButton").hide();
            jQuery("#goSearchButton").hide();
            jQuery("#ranks_Input").next("span").text("This Pin Level");
            jQuery("#searchName_Input").val(jQuery("#searchName_Input")[0].defaultValue);

            // Reset the application attributes
            root = loggedin,
            state = {},
            breadcrumbs = [],
            selected = undefined,
            index = {},
            index.length = 0;

            // Default back to the logged in marketer
            setMyInfo(root);
            buildSearchIndex(root.Leg);

            // Update the dropdowns
            resetDropDowns();
        }

        // Get rank requirements
        // @isBackOffice: A boolean indicating if current page context is back office
        function getRankRequirements(isBackOffice) {
            jQuery.ajax({
                type: "GET",
                async: true,
                contentType: "application/json; charset=utf-8",
                url: "services/MarketerServices.asmx/GetRankRequirements",
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    if (isBackOffice) {
                        requirements = stringToObject(json);
                        getMyInfo({ AccountID: +jQuery("#accountid").val() }, true);
                        return true;
                    }
                    requirements = stringToObject(json);

                    updateProgressBar("Retrieving rank information");
                    // Get a listing of all the ranks
                    getRanks();
                }
            });
        }

        // Get rank requirements
        // @isBackOffice: A boolean indicating if current page context is back office
        function getEmailAddresses(AccountID, callback) {
            jQuery.ajax({
                type: "GET",
                async: true,
                contentType: "application/json; charset=utf-8",
                url: "services/MarketerServices.asmx/GetEmailAddresses?_ID=" + AccountID,
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    callback(stringToObject(json));
                }
            });
        }

        // Get profile list
        // @id: Marketer ID
        function getProfileList(id) {
            var returnVal = false;
            jQuery.ajax({
                type: "GET",
                async: false,
                contentType: "application/json; charset=utf-8",
                url: "services/MarketerServices.asmx/GetProfileList?_ID=" + id,
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    json = stringToObject(json);

                    returnVal = json;
                }
            });

            return returnVal;
        }

        // Get contact details
        // @id: Marketer ID
        function getProfileContactDetails(id) {
            var returnVal = false;
            jQuery.ajax({
                type: "GET",
                async: false,
                contentType: "application/json; charset=utf-8",
                url: "services/MarketerServices.asmx/GetProfileContactInfo?_ID=" + id,
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    json = stringToObject(json);

                    returnVal = json;
                }
            });

            return returnVal;
        }

        // Get ranks
        // @isBackOffice: A boolean indicating if current page context is back office
        function getRanks(isBackOffice) {
            jQuery.ajax({
                type: "GET",
                async: true,
                contentType: "application/javascript; charset=utf-8",
                url: "services/MarketerServices.asmx/GetRanks",
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    if (isBackOffice) {
                        ranks = stringToObject(json);
                        getRankRequirements(true);
                        return true;
                    }
                    ranks = stringToObject(json);

                    // Get the myinfo for the logged in guy
                    updateProgressBar("Retrieving your account information");
                    getMyInfo(map[0]);
                }
            });
        }

        // Get My info
        // @marketer: Marketer object
        // @isBackOffice: A boolean indicating if current page context is back office
        function getMyInfo(marketer, isBackOffice) {
            jQuery.ajax({
                type: "GET",
                async: true,
                contentType: "application/json; charset=utf-8",
                url: "services/MarketerServices.asmx/GetMyInfo?_ID=" + marketer.AccountID,
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    if (isBackOffice) {
                        myinfo = stringToObject(json);
                        setMyInfo();
                        return true;
                    }

                    myinfo = stringToObject(json);

                    updateProgressBar("Indexing your downline to improve search results");
                    // Build out the index for searching first
                    index = {};
                    index.length = 0;

                    if (buildSearchIndex(map)) {
                        delete index[map[0].UniqueAccountID];
                        updateProgressBar("Generating functionality");
                        // Build out map functionality -- adding methods
                        if (buildMap(map)) {
                            updateProgressBar("Application successfully loaded", true);

                            // Use this timeout to give the user a moment to see the 100% complete.
                            window.setTimeout(function() {

                                // Trigger the ajax complete method
                                ajaxComplete();

                            }, 500);
                        }
                    }
                }
            });
        }

        // Run this once all ajax methods are done
        function ajaxComplete() {
            // There will always be a root parent

            root = map[0];
            loggedin = map[0];

            setMyInfo(root); // Set the info box

            // Reset drop downs
            reset();

            // Hide the scrollers
            scroll();

            // Modals
            jQuery("#load").modalize("#loadModal");

            // Override modal
            jQuery("#save").bind("click", function() {
                var $this = jQuery(this);
                if (JSON2.stringify(state) === "{}" && !$this.hasClass("save-error") ||
					(typeof state[loggedin.UniqueAccountID] !== "undefined" && !state[loggedin.UniqueAccountID].length)) {

                    $this.addClass("save-error");
                }
                else if (JSON2.stringify(state) !== "{}") {
                    $this.removeClass("save-error");
                }
            });

            // Modal inits
            jQuery(".save-error").modalize({ selector: ".modal", text: "You have not locked any marketers, there is nothing to save." });
            jQuery("#save").modalize("#saveModal");
            jQuery(".appit > img").modalize("#uplineModal");
            jQuery(".ModalEnabler").modalize({ selector: ".modal", text: "Feature not available in beta." });
            jQuery("#sendEmailBtn").modalize("#directMail");

            // Show the rest of the app
            jQuery("#detailsEstimation").show();
            jQuery("#goalEstimationTool").show();

            // Cleanup loading/disabled stuff
            jQuery(".blackOut").hide();
            jQuery(".LoadingWrap").hide();
            jQuery("#searchField").removeAttr("disabled");
            jQuery("#levels ul").html("");
            jQuery(".VideoTutorial").hide();
        }

        // Display upline
        function upline() {
            window.setTimeout(function() {
                jQuery("#uplineModal .UplineList li").remove();
                jQuery.ajax({
                    type: "GET",
                    async: false,
                    contentType: "application/json; charset=utf-8",
                    url: "services/MarketerServices.asmx/GetAccountUpline?_ID=" + selected.AccountID + "&_PARENT=" + loggedin.AccountID,
                    dataType: "text",
                    error: function(xhr) {
                        if (xhr.responseText.indexOf("logged_out") > -1)
                            redirectToLogin();
                    },
                    success: function(json) {
                        var matches = {};
                        matches = stringToObject(json);

                        for (var i = 0; i < matches.length; i++) {
                            jQuery("#uplineModal .UplineList").append("<li class='" + ((i % 2) ? "even" : "odd") + "'><img src='GenericImageEditor/imagehandler.aspx?id=" + matches[i].AccountID + "' alt='Profile Image' />" +
																	  "<div class='info'><span class='name'>" + convertNameToFirstLast(matches[i].AccountName) + "</span><br />" +
																	  "<span class='phone'>Phone " + convertPhone(matches[i].Phone) + "</span><br />" +
																      "<a href='mailto:" + findMarketer(matches[i].AccountID + "M").EmailAddress + "'>" + findMarketer(matches[i].AccountID + "M").EmailAddress + "</a></div></li>");
                        }
                    }
                });

            }, 0);
        }

        // Reset the dropdowns
        function resetDropDowns() {
            try {
                // My goal
                var goal = $find("goal");
                buildGoalDropdown(goal, root);

                // Hide the close to rank extra dropdowns
                var ranksName = $find("ranksName");
                ranksName.set_selectedIndex(0);

                var $ranksNameTxt = jQuery("#ranksName_Input").val("Now Select a Marketer");

                // Hide the search by name dropdowns
                var searchName = $find("searchName");
                searchName.clearItems();
                searchName.commitChanges();

                jQuery("#goConnectorButton").hide();
                jQuery("#goSearchButton").hide();

                // Hide Rank Error
                jQuery(".RankError").remove();

                var ranksGoal = $find("ranksGoal");
                ranksGoal.clearItems();
                jQuery("#ranksGoal").hide();

                // Build out ranks for initial use
                var ranks = $find("ranks");
                buildRanksDropdown(ranks, 3);

                ranks.get_items().getItem(0).select();

                jQuery("#ranksName").hide();

                var searchGoal = $find("searchGoal");
                searchGoal.clearItems();

                goal.get_items().getItem(0).select();
                goal.commitChanges();

                jQuery("#goal_Input").next().html("Choose a Pin Level Goal");
                jQuery("#searchGoal_Input").next().html("Choose a Pin Level Goal");
                jQuery("#ranksGoal_Input").next().html("Choose a Pin Level Goal");
                jQuery("#ranks_Input").val("This Pin Level");

                jQuery("#searchGoal").hide();

                // Disable the first entry
                var focus = function() {
                    this.get_items().getItem(0).set_enabled(false);
                    this.commitChanges();
                };

                goal._onFocus = focus;
                ranks._onFocus = focus;
            } catch (error) { }
        }

        // This is a redundant function that facilitates the search mechanism, it is needed to do some prechecks or erase the results list
        function redundant() {
            var that = $find("searchName").get_text();
            // if the textbox has more than 2 characters, start searching
            if (that.length > 2) {
                search(that);
            }
            else {
                var dropdown = $find("searchName");
                var ranksGoal = $find("ranksGoal");
                ranksGoal.disable();
                if (dropdown !== null)
                    dropdown.clearItems();
            }
        }

        // Perform search by name
        // @val: Text input by user for searching
        function search(val) {
            if (index.length > 0) {
                var dropdown = $find("searchName");
                dropdown.clearItems();

                var total = 0;
                val = val.toLowerCase();
                // Find search results and add to temporary array
                var results = [];
                for (var i in index) {
                    if (!index.hasOwnProperty(i) || i.slice(-1) === "O")
                        continue;

                    var name = index[i].AccountName;
                    if (name !== undefined) {
                        var search = name + " " + convertNameToFirstLast(name) + " " + name.replace(", ", " ");
                        if (search.toLowerCase().indexOf(val) > -1) {
                            results.push({ "id": i, "name": name, "unilevel": (index[i].AbsLevel - loggedin.AbsLevel) });
                            total = total + 1;
                        }
                    }
                }

                // Sort the results by name
                var sortedResults = sort(results, byName);

                // Loop through sorted results and 
                for (var i = 0, len = sortedResults.length; i < len; i++) {
                    var item = new Telerik.Web.UI.RadComboBoxItem();
                    item.set_text(sortedResults[i].name + " (" + sortedResults[i].unilevel + ")");
                    item.set_value(sortedResults[i].id);

                    dropdown.get_items().add(item);
                    dropdown.trackChanges();
                }

                if (total < 0) {
                    jQuery("#searchName_DropDown").css("border-width", "0px");
                    dropdown.clearItems();
                }
                else {
                    jQuery("#searchName_DropDown").css("border-width", "1px");
                    dropdown.showDropDown();
                }

                dropdown.commitChanges();
            }
        }

        // Speed up marketer lookups
        // @leg: Marketer leg property
        function buildSearchIndex(leg) {
            var i = leg.length; while (i--) {
                var marketer = leg[i];

                index[marketer.UniqueAccountID] = marketer;
                index.length += 1;

                if (marketer.Leg.length > 0) {
                    buildSearchIndex(marketer.Leg);
                }
            };

            return true;
        }

        // This fills the goal drop down menu
        // @dropdown: A Telerik dropdown object
        // @marketer: A Marketer object
        function buildGoalDropdown(dropdown, marketer) {
            dropdown.clearItems();
            var item = new Telerik.Web.UI.RadComboBoxItem();
            item.set_text("Choose a Pin Level Goal");
            dropdown.get_items().add(item);
            var i = 0; do {
                if ((!attainedRank(marketer.RankID, ranks[i].RankID) || findRankById(marketer.RankID).RankSeq === findRankById(ranks[i].RankID).RankSeq) && ranks[i].RankID < 15) {
                    var item = new Telerik.Web.UI.RadComboBoxItem();
                    item.set_text(modifyStarRank(ranks[i].RankName));
                    item.set_value(ranks[i].RankID);
                    dropdown.trackChanges();
                    dropdown.get_items().add(item);
                }
            } while ((i = i + 1) < ranks.length);

            dropdown.commitChanges();
            dropdown.enable();
            dropdown.get_items().getItem(0).disable();
        }

        // For searching by rank
        // @dropdown: A Telerik dropdown object
        // @rank: A Rank object
        function buildRanksDropdown(dropdown, rank) {
            dropdown.clearItems();
            var item = new Telerik.Web.UI.RadComboBoxItem();
            item.set_text("This Pin Level");
            dropdown.get_items().add(item);
            var i = 0; do {
                if ((!attainedRank(rank, ranks[i].RankID) || findRankById(rank).RankSeq === findRankById(ranks[i].RankID).RankSeq) && ranks[i].RankID < 15) {
                    var item = new Telerik.Web.UI.RadComboBoxItem();
                    item.set_text(modifyStarRank(ranks[i].RankName));
                    item.set_value(ranks[i].RankID);
                    dropdown.trackChanges();
                    dropdown.get_items().add(item);
                }
            } while ((i = i + 1) < ranks.length);
            dropdown.commitChanges();
            dropdown.enable();
            dropdown.get_items().getItem(0).disable();
        }

        // Build out the static map
        // @leg: Marketer leg property
        function buildMap(leg) {
            var i = 0; do {
                var marketer = leg[i];
                // Add properties
                marketer.desiredRank = null;
                marketer.unilevel = findUnilevelRequirement(marketer.desiredRank).unilevel;
                marketer.RankID = (marketer.RankID === 0) ? 1 : marketer.RankID;
                marketer.distanceLine = null
                marketer.calcCGV = function() {
                    this.unilevel = findUnilevelRequirement(this.desiredRank).unilevel;
                    this.cgv = (typeof this[this.unilevel] === "undefined") ? this.TotalComVol : this[this.unilevel];
                };

                // Add methods
                marketer.findMarketers = findMarketers; 				// Finds all marketers in someones downline
                marketer.findDistance = findDistance; 				// Find the distance to a given ID
                marketer.findMarketersNearRank = findMarketersNearRank; // Find the closeness to a given rank
                marketer.findDistanceLine = findDistanceLine; 		// Get the marketers to a given level
                marketer.findFrontLine = findFrontLine; 				// Find the front line

                // Continue building for everyone in the structure
                if (marketer.Leg.length > 0) {
                    buildMap(marketer.Leg);
                }
            } while ((i = i + 1) < leg.length);

            return true;
        }

        /////////////// START HERE

        // Find a list of marketers matching a given rank
        function findMarketersByRank(leg, rankid) {
            var len = leg.length; while (len--) {
                var marketer = leg[len];

                // If ranks match push to the list
                if (marketer.RankID === rankid)
                    this[this.length] = marketer;

                // Loop through this marketer's leg structure
                if (marketer.Leg.length)
                    findMarketersByRank.call(this, marketer.Leg, rankid);
            }

            return this;
        }

        // Find a list of marketers who reside directly below the marketer
        function findFrontLine(leg, abslevel) {
            var len = leg.length; while (len--) {
                var marketer = leg[len];

                // If ranks match push to the list
                if ((abslevel + 1) === marketer.AbsLevel)
                    this.push(marketer);

                // Loop through this marketer's leg structure
                if (marketer.Leg.length)
                    findFrontLine.call(this, marketer.Leg, abslevel);
            }

            return this;
        }

        // Set the variable rank to the highest rank in the downline
        function findHighestRanked(leg, rankid) {
            var i = 0, len = leg.length; while (i < len) {
                var marketer = leg[i];

                if (marketer.RankID > rankid)
                    rankid = marketer.RankID;

                if (marketer.Leg.length > 0)
                    findHighestRanked(marketer.Leg, rankid);

                i++;
            }

            return rankid;
        }

        // Find all of someones marketers
        function findMarketers(leg) {
            var len = leg.length; while (len--) {
                var marketer = leg[len];

                this[this.length] = marketer;

                if (marketer.Leg.length > 0)
                    findMarketers.call(this, marketer.Leg);
            }

            return this;
        }

        // Easier to find a marketer now	
        function findMarketer(id) {
            if (id === loggedin.UniqueAccountID) {
                return loggedin;
            }
            return index[id];
        }

        // Find the nesting distance to a given marketers AbsLevel
        function findDistance(level) {
            // Make sure the level is larger than what we are subtracting from
            if (level < this.AbsLevel) {
                return (this.AbsLevel - level);
            }
            else {
                return null;
            }
        }

        // Find the distance line
        function findDistanceLine(loc, parentid, matches, upline) {
            var marketer = undefined,
				setProperty = false;

            if (typeof loc === "undefined") {
                marketer = this.UniqueAccountID;
                setProperty = true;
            }
            else {
                marketer = loc;
            }

            // Done
            if (!upline) {
                if (marketer.ParentAccountID + "M" === parentid) {
                    this.distanceLine = matches;
                    return false;
                }
            }
            else {
                if (marketer.ParentAccountID + "M" === parentid) {
                    matches.push(findMarketer(parentid + "M"));
                    this.distanceLine = matches;
                    return matches;
                }
            }

            // Else
            var parent = findMarketer(marketer.ParentAccountID + "M")
            if (parent !== undefined) {
                matches.push(parent);

                if (parent.ParentAccountID + "M" !== parentid)
                    findDistanceLine(parent, parentid, matches, upline);
            }

            if (setProperty === true)
                this.distanceLine = matches;

            return false;
        }


        // Find the closeness to a given rank
        function findMarketersNearRank(loc, rankid, matches) {
            var len = loc.length; while (len--) {
                var marketer = loc[len];

                // Check if its close to a rank
                marketer.desiredRank = rankid;
                marketer.calcCGV();
                
                if (closeToRank(marketer, rankid) === true)
                    matches.push(marketer);

                if (marketer.Leg.length > 0)
                    findMarketersNearRank(marketer.Leg, rankid, matches);
            }

            return matches;
        }

        // Populate the info box
        function setMyInfo() {
            try {

                var $detailsEstimation = jQuery("#detailsEstimation");
                $detailsEstimation.find(".NameRank h2").html(convertNameToFirstLast(myinfo[0].AccountName));
                $detailsEstimation.find(".NameRank h3").html(myinfo[0].CurrentRankName);
                $detailsEstimation.find("#qualified").html("&nbsp;&nbsp;" + myinfo[0].FSBRankName);
                var $goalEstimationTool1 = jQuery("#goalEstimationTool");

                if (map[0] !== undefined && map[0].ComPerStartDate !== undefined)
                    $goalEstimationTool1.find("#goalformonth").html("&nbsp;" + map[0].ComPerStartDate);

                if (myinfo[0].FSBRankName === "Not Qualified")
                    $detailsEstimation.find("#qualified").prepend(jQuery("<img src='includes/images/downline_tools/leftcol/icon-crossout.png'/>"));
                else
                    $detailsEstimation.find("#qualified").prepend(jQuery("<img src='includes/images/downline_tools/leftcol/icon-check.png'/>"));

                // Populate the month tabs
                var current = new Date(),
                    previous = new Date();

                // Using 25 as the day for the edge case where feburary cannot go to the 30th
                previous.setMonth(previous.getMonth() - 1, 25);

                // Set the actual li content
                $detailsEstimation.find(".tabs > :first(li)").html(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][previous.getMonth()].toUpperCase() + " " + previous.getFullYear());
                $detailsEstimation.find(".tabs > :last(li)").html(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][current.getMonth()].toUpperCase() + " " + current.getFullYear());

                // Change 
                $detailsEstimation.find(".tabs > :first(li)").click(function() {
                    jQuery(".NameRank").find("h3").text(myinfo[0]["PriorRankName"]);
                });

                $detailsEstimation.find(".tabs > :last(li)").click(function() {
                    jQuery(".NameRank").find("h3").text(myinfo[0]["CurrentRankName"]);
                });

                // Initial populates
                populateThisMonth();
                populatePreviousMonth();

            }
            catch (ex) { }
        }

        // Convert name to first last
        function convertNameToFirstLast(str) {
            var name = str.split(", ");
            return [name[1], name[0]].join(" ");
        }

        function convertPhone(number) {
            return "(" + number.substring(0, 3) + ") " + number.substring(3, 6) + " " + number.substr(6);
        }

        // Populate this months box
        function populateThisMonth() {
            jQuery("#detailsEstimation").find("#currentMonth .points").html("CV " + formatCurrency(parseFloat(myinfo[0].CurrentTotalComVol)) + "  | CGV " + formatCurrency(parseFloat(myinfo[0].CurrentGroupComVol)));
            jQuery("#currentMonth .Bonuses").html("");

            var total = 0;
            for (var i = 0; i < 5; i++) {
                var date = myinfo[0]["CurrentWeek" + (i + 1) + "Date"];
                var amount = myinfo[0]["CurrentWeek" + (i + 1) + "CheckAmt"];
                if (date !== null) {
                    jQuery("<li><span style='width: 90px; display: inline-block;'>Week Ending: </span><span style='display: inline-block; width: 32px; text-align: right;'>" + date + "</span><span style='width: 80px; display: inline-block; text-align: right;'>$" + formatCurrency(amount) + "</span></li>").appendTo("#currentMonth .Bonuses");
                    total += amount;
                }
            }

            // Show totals
            if (i > 0)
                jQuery("<li class='total'>TOTAL: $" + formatCurrency(total) + "</li>").appendTo("#currentMonth > .Bonuses");
        }

        // Populate the previous month's
        function populatePreviousMonth() {
            jQuery("#detailsEstimation").find("#previousMonth .points").html("CV " + formatCurrency(parseFloat(myinfo[0].PriorTotalComVol)) + "  | CGV " + formatCurrency(parseFloat(myinfo[0].PriorGroupComVol)));
            jQuery("#previousMonth .Bonuses").html("");

            var total = 0;
            for (var i = 0; i < 5; i++) {
                var date = myinfo[0]["PriorWeek" + (i + 1) + "Date"];
                var amount = myinfo[0]["PriorWeek" + (i + 1) + "CheckAmt"];
                if (date !== null) {
                    jQuery("<li><span style='width: 90px; display: inline-block;'>Week Ending: </span><span style='display: inline-block; width: 32px; text-align: right;'>" + date + "</span><span style='width: 80px; display: inline-block; text-align: right;'>$" + formatCurrency(amount) + "</span></li>").appendTo("#previousMonth > .Bonuses");
                    total += amount;
                }
            }

            // Show totals
            if (i > 0) jQuery("<li class='total'>TOTAL: $" + formatCurrency(total) + "</li>").appendTo("#previousMonth > .Bonuses");
        }

        // This will convert the rank code to the real rank name for display
        function getFullRank(code) {
            for (var i = 0, len = ranks.length; i < len; i++) {
                if (ranks[i].RankCode === code) {
                    var rankName = ranks[i].RankName;

                    if (rankName.length > 20) {
                        rankName = rankName.replace(" Director", "");
                        rankName = rankName.replace("Fast Start", "FastStart");
                    }

                    return rankName;
                }
            }
            return code;
        }

        // Properly format currency
        function formatCurrency(number) {
            number = number.toFixed(2) + "";
            var numOfCommas = Math.ceil((((number).length - 3) / 3) - 1);
            var returnStr = "";
            for (var i = 0; i < numOfCommas; i++) {
                returnStr = "," + number.substring(number.length - ((3 * i) + 3), number.length - ((3 * i) + 6)) + returnStr;
            }
            return number.substring(0, number.length - (numOfCommas * 3) - 3) + returnStr + number.substr(number.length - 3);
        }

        // Format in some commas
        function formatComma(number) {
            number = number.toFixed(2) + "";
            var numOfCommas = Math.ceil((((number).length - 3) / 3) - 1);
            var returnStr = "";
            for (var i = 0; i < numOfCommas; i++) {
                returnStr = "," + number.substring(number.length - ((3 * i) + 3), number.length - ((3 * i) + 6)) + returnStr;
            }

            returnStr = number.substring(0, number.length - (numOfCommas * 3) - 3) + returnStr + number.substr(number.length - 3);
            return returnStr.substring(0, returnStr.length - 3);
        }

        // Format phone number
        function formatPhone(phone) {
            return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
        }

        // Convert digit to word
        function convertNumberToString(digit) {
            switch (digit) {
                case 1:
                    return "one";
                    break;
                case 2:
                    return "two";
                    break;
                case 3:
                    return "three";
                    break;
                case 4:
                    return "four";
                    break;
                case 5:
                    return "five";
                    break;
                case 6:
                    return "six";
                    break;
                case 7:
                    return "seven";
                    break;
                case 8:
                    return "eight";
                    break;
                case 9:
                    return "nine";
                    break;
                default:
                    return digit;
                    break;
            }
        }

        // Literally convert word to digit
        function convertStringToNumber(word) {
            switch (word.toLowerCase()) {
                case "one":
                    return 1;
                    break;
                case "two":
                    return 2;
                    break;
                case "three":
                    return 3;
                    break;
                case "four":
                    return 4;
                    break;
                case "five":
                    return 5;
                    break;
                case "six":
                    return 6;
                    break;
                case "seven":
                    return 7;
                    break;
                case "eight":
                    return 8;
                    break;
                case "nine":
                    return 9;
                    break;
                default:
                    return word;
                    break;
            }
        }
        
        // Create an array upline
        function createUpLineArray(marketer) {
            var upline = [];
            findDistanceLine(marketer, loggedin.UniqueAccountID, upline);
            for(var i=0; i<upline.length; i++) {
                upline[i] = upline[i].UniqueAccountID;
            }
            
            return upline.reverse();
        }

        // Pin to save buffer
        function pin(parent, dragged, pos) {
            var rootState = state[root.UniqueAccountID];
            if (typeof rootState !== "undefined") {
                for (var i = 0; i < rootState.length; i++) {
                    var instance = rootState[i];
                    if (instance.parent === parent && (instance.marketer === dragged || instance.position === pos))
                        rootState.splice(i, 1);
                }
                rootState.push({ "parent": parent, "marketer": dragged, "position": pos, "upline": createUpLineArray(findMarketer(dragged)) });
            }
            else {
                rootState = [];
                rootState.push({ "parent": parent, "marketer": dragged, "position": pos, "upline": createUpLineArray(findMarketer(dragged)) });
            }
            state[root.UniqueAccountID] = rootState;
        }

        // Unpin from save buffer
        function unpin(parent, dragged, col) {
            var rootState = state[root.UniqueAccountID];
            for (var i = 0; i < rootState.length; i++) {
                if (rootState[i].marketer === dragged)
                    rootState.splice(i, 1);
            }

            // Reattach based on column
            if (col === "r") {
                jQuery("div.column.rightCol div.boxItem:not(.bottom)").not(".gray").draggable({ revert: true, drag: rightColDrag });
                jQuery("div.column.rightCol div.boxItem").droppable({
                    tolerance: 'pointer',
                    accept: 'div.column.rightCol div.boxItem, .MiniBoxItems li',
                    drop: rightColDrop
                });
            }
            else {
                jQuery("div.column.midCol div.boxItem:not(.bottom)").draggable({ revert: true });
                jQuery("div.column.midCol div.boxItem, div.column.modCol").droppable({
                    tolerance: 'pointer',
                    accept: 'div.column.midCol .boxItem, div.column.rightCol div.boxItem, .MiniBoxItems li',
                    drop: midColDrop
                });

                // Set your goals marker droppable
                jQuery(".yourGoalsMarker").droppable({
                    tolerance: 'pointer',
                    accept: 'div.column.midCol div.boxItem, div.column.rightCol div.boxItem, .MiniBoxItems li',
                    drop: yourGoalsMarkerDrop
                });
            }

            state[root.UniqueAccountID] = rootState;
        }

        // Save the save object to a cookie
        function save(msg) {
            var innerMsg = msg;
            // Get list and check if 
            jQuery.ajax({
                type: "GET",
                contentType: "application/json; charset=utf-8",
                url: "services/MarketerServices.asmx/GetStates",
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    json = json.replace(/\\\\\\/g, "\\");
                    var states = stringToObject(json);
                    for (var i in states) {
                        if (unescape(states[i].StateName).toLowerCase() === innerMsg.toLowerCase()) {
                            //Display error
                            jQuery(".ModalErrorMessage").html("The sponsor of one or more of the people saved within this file has changed since the creation of this file.  This is no longer a valid save file and has been deleted.");
                            return false;
                        }
                    }

                    // Go through without error
                    if (innerMsg !== null) {
                        // Pad state with actions taken
                        state["initProcess"] = initProcess;
                        
                        // save the state
                        jQuery.ajax({
                            type: "GET",
                            contentType: "application/json; charset=utf-8",
                            url: ["services/MarketerServices.asmx/SaveState?_NAME=", innerMsg, "&_JSON=", JSON2.stringify(state)].join(""),
                            dataType: "text",
                            error: function(xhr) {
                                if (xhr.responseText.indexOf("logged_out") > -1)
                                    redirectToLogin();
                            },
                            success: function(json) {
                                jQuery(".ModalWrap").find(".ModalClose").trigger("click");
                            }
                        });
                    }
                }
            });
        }

        // Load the save object from the cookie into the global namespace - and refresh the data
        function load() {
            jQuery.ajax({
                type: "GET",
                contentType: "application/json; charset=utf-8",
                url: ["services/MarketerServices.asmx/GetStates?_ID=", loggedin.AccountID].join(""),
                dataType: "text",
                error: function(xhr) {
                    if (xhr.responseText.indexOf("logged_out") > -1)
                        redirectToLogin();
                },
                success: function(json) {
                    json = json.replace(/\\\\\\/g, "\\");
                    var states = stringToObject(json),
                        $states = jQuery("#states");

                    $states.empty();
                    for (var i in states) {
                        jQuery("<li>" + states[i].StateName + "<span class='dlt-file'>DELETE</span></li>").appendTo($states).data("data", states[i].StateData);
                    }
                }
            });
        }

        // Converts between rank id and rank name
        function translateRank(_rank, _trim) {
            if (typeof _rank === "number") {
                var i = 0; do {
                    var rank = ranks[i];
                    if (rank.RankID === _rank) {
                        var rankName = rank.RankName;

                        if (rankName.length > 26 && _trim === true) {
                            rankName = rankName.replace(" Director", "");
                            rankName = rankName.replace("Fast Start", "FastStart");
                        }

                        return rankName;

                    }
                } while ((i = i + 1) < ranks.length);
            }
            else {
                var i = 0; do {
                    var rank = ranks[i];
                    if (rank.RankName == _rank) {
                        return rank.RankID;
                    }
                } while ((i = i + 1) < ranks.length);
            }
        }

        // This should add proper stars
        function modifyStarRank(rank, span) {
            if (typeof rank === "undefined") {
                return rank;
            }
            var adjustedRank = "";

            // If there is a star in the rank
            if (rank.toLowerCase().indexOf("star ") > -1) {
                for (var i = 0; i < convertStringToNumber(rank.substring(rank.toLowerCase().indexOf("star") - 1, 0)); i++) {
                    adjustedRank += "<span class='star'>&nbsp;</span>";
                }
                rank = rank.substr(rank.toLowerCase().indexOf("star") + 4);
            }

            // Alter the returned string is the span tag is required to position properly
            if (typeof span !== "undefined") {
                adjustedRank = "<span class='starRank'>" + ((adjustedRank !== "") ? adjustedRank : "&nbsp;") + "</span>";
            }

            return (adjustedRank += rank);
        }

        // Return the "progress bar" width
        function calcProgress(current, required) {
            var returnVal = Math.ceil((current * width) / required);
            returnVal = (returnVal > width) ? width : returnVal;
            return (isNaN(returnVal)) ? 0 : returnVal;
        }


        // A Go button was just clicked, clean up the Goal Planner.
        function goButtonClicked(evt, options) {
            // Remove middle and right box items and associated triangles
            jQuery(".column.midCol .boxItem, .column.rightCol .boxItem, .yourGoalsMarker > .triangle").remove();

            // Hide elements
            jQuery(".rolloverMenu, #mainDetails, #tabBlackNumber").hide();

            // Show elements
            jQuery("#detailsEstimation").show();

            jQuery("#tabBlackNumber span").html("0");
            breadcrumbs = [];
            scroll();

            jQuery("#goalEstimationTool").removeClass("inactive").addClass("active");
            
            // Save correct process
            var tmpProcess = { "handler": this.id, "steps": [] };
            for(var i = 0; i<options.length; i++) {
                tmpProcess.steps.push(options[i]);
            }
            initProcess = tmpProcess;
        };


        // Populate the middle info box
        function setSelectedInfo(marketer, selected, color, pinned, overflowed) {
            var currentCv = parseFloat(marketer.TotalQualVol),
                requiredCv = parseFloat(findCVRequirement(marketer.desiredRank)),
                overflow = "",
                // Caching selector for speed improvements
                $yourGoalsMarker = jQuery(".yourGoalsMarker");

            // Switch the color
            if (typeof selected !== "undefined") {
                $yourGoalsMarker.attr("id", "m_" + marketer.UniqueAccountID);
                $yourGoalsMarker.attr("class", "yourGoalsMarker");
                $yourGoalsMarker.addClass(color);
                $yourGoalsMarker.find("#buttons > .last").hide();

                if (pinned === true)
                    lock = "<div class='lock pinned'></div>";
                else
                    lock = "<div class='lock'></div>";

                if (overflowed === true) {
                    overflow = "<div class='overflow'/>";
                    lock = jQuery("<div/>").append(jQuery(lock).css("visibility", "hidden")).html();
                }
                else {
                    jQuery(".overflow", $yourGoalsMarker).remove();
                    lock = jQuery("<div/>").append(jQuery(lock).css("visibility", "visible")).html();
                }
                
                $yourGoalsMarker.find(".lock").replaceWith(lock + overflow);
                
                // Show correct triangle
                var parent = breadcrumbs[breadcrumbs.length - 1];
                marketer.findDistanceLine(undefined, parent.UniqueAccountID, []);
                var distance = marketer.distanceLine.length;
                var triangle = (distance > 0) ? "<div class='triangle " + convertNumberToString(distance) + "'>" + distance + "</div>" : "";
                jQuery(".yourGoalsMarker .triangle").remove();
                $yourGoalsMarker.prepend(triangle);
            }
            else {
                $yourGoalsMarker.removeAttr("id");
                $yourGoalsMarker.attr("id", "m_" + marketer.UniqueAccountID);
                $yourGoalsMarker.attr("class", "yourGoalsMarker");
                $yourGoalsMarker.find("#buttons > .last").show();
                $yourGoalsMarker.find(".lock").hide();
            }
            $yourGoalsMarker.attr("id", "m_" + marketer.UniqueAccountID);

            $yourGoalsMarker.find("#selectedProfilePic").attr("src", "GenericImageEditor/imagehandler.aspx?id=" + marketer.AccountID).attr("width", "55").attr("height", "55");

            $yourGoalsMarker.find("#selectedName").html(convertNameToFirstLast(marketer.AccountName).substring(0, 18));
            $yourGoalsMarker.find("#selectedCurrentRank").html("<span>Currently</span>" + modifyStarRank(getFullRank(marketer.RankName), true));
            $yourGoalsMarker.find("#selectedDesiredRank").html("<span>Desired</span>" + modifyStarRank(translateRank(marketer.desiredRank), true));
            $yourGoalsMarker.find("#selectedCv > p").html("CV " + formatCurrency(currentCv));
            $yourGoalsMarker.find("#selectedRequiredCv").html("CV " + formatComma(requiredCv));

            // Show proper cv bar width
            $yourGoalsMarker.find("#selectedCv > span").css("width", calcProgress(currentCv, requiredCv) + "px");

            // Find cgv based off desired rank
            var desiredUnilevel = findUnilevelRequirement(marketer.desiredRank).unilevel,
                currentCgv = (!parseFloat(marketer.cgv)) ? 0 : parseFloat(marketer.cgv),
                requiredCgv = parseFloat(findCGVRequirement(marketer.desiredRank, desiredUnilevel));

            requiredCgv = requiredCgv || 0;

            if (desiredUnilevel !== null) {
                $yourGoalsMarker.find("#selectedRequiredCvg").parent().show();

                $yourGoalsMarker.find("#selectedCvg p").html(["CGV ", formatCurrency(currentCgv)].join(""));
                $yourGoalsMarker.find("#selectedRequiredCvg").html(["CGV ", formatComma(requiredCgv)].join(""));
            }
            else {
                currentCgv = currentCv;
                $yourGoalsMarker.find("#selectedRequiredCvg").parent().show();

                $yourGoalsMarker.find("#selectedCvg p").html("CGV " + formatCurrency(currentCgv));
                $yourGoalsMarker.find("#selectedRequiredCvg").html(["CGV ", formatComma(requiredCgv)].join(""));
            }

            // Show proper cgv bar width
            jQuery(".yourGoalsMarker").find("#selectedCvg span").css("width", calcProgress(currentCgv, requiredCgv) + "px");
            jQuery(".yourGoalsMarker").show();

            // Only make those who are selectable droppable
            if (root.UniqueAccountID !== marketer.UniqueAccountID) {
                $yourGoalsMarker.droppable({
                    tolerance: 'pointer',
                    accept: '.column.midCol .boxItem, .column.rightCol .boxItem, .MiniBoxItems li',
                    drop: yourGoalsMarkerDrop
                });
            }
            else {
                $yourGoalsMarker.droppable("destroy");
            }
        }

        // Scroll (either left or right)
        function scroll(dir) {
            jQuery("#profileSettings").hide();
            jQuery("#goalsSummary").hide();

            // Filter by direction
            switch (dir) {
                case "right":
                    // Can scroll right
                    if (jQuery(".column.rightCol > div").is(".boxItem")) {
                        breadcrumbs.push(selected);
                        if (breadcrumbs.length === 1) {
                            jQuery("#detailsEstimation").hide();
                            jQuery("#mainDetails").remove();
                            var newDiv = jQuery(".yourGoalsMarker").clone();
                            newDiv.removeAttr("class");
                            newDiv.attr("id", "mainDetails");
                            newDiv.insertBefore("#goalEstimationTool");
                        }

                        updateMiddleColumn(selected);
                        jQuery("#tabBlackNumber span").html("+" + (+jQuery("#tabBlackNumber span").html() + 1));
                        jQuery("#tabBlackNumber").show();
                    }
                    break;
                case "left":
                    // Can scroll left
                    if (breadcrumbs.length > 0) {
                        // Back at the beginning
                        if (breadcrumbs.length === 1) {
                            jQuery(".column.midCol").children(".boxItem").remove();
                            jQuery(".yourGoalsMarker").children(".triangle").remove();
                            jQuery(".yourGoalsMarker").removeClass("yellow");

                            selected = breadcrumbs.pop();
                            setSelectedInfo(selected);
                            updateRightColumn(selected);

                            jQuery("#tabBlackNumber span").html("+" + (+jQuery("#tabBlackNumber span").html() - 1));
                            jQuery("#tabBlackNumber").hide();

                            jQuery(".column.leftCol > #mainDetails").remove();
                            jQuery("#detailsEstimation").show();
                        }
                        else {
                            selected = breadcrumbs.pop();

                            // Apply color
                            if (typeof selected.color === "undefined")
                                selected.color = "red";
                            if (closeToRank(selected, selected.desiredRank))
                                selected.color = "yellow";
                            else if (attainedRank(selected.RankID, selected.desiredRank))
                                selected.color = "green";

                            updateMiddleColumn(breadcrumbs[breadcrumbs.length - 1], selected, selected.color);
                            updateRightColumn(selected);
                            jQuery("#tabBlackNumber > span").html("+" + (+jQuery("#tabBlackNumber > span").html() - 1));
                        }
                    }
                    break;
                default:
                    // Do nothing
                    break;
            }

            // Show/Hide the left control
            if (breadcrumbs.length <= 0) {
                jQuery("#scroller .scrollLeft").hide();
            }
            else {
                jQuery("#scroller .scrollLeft").show();
            }

            // Show/Hide the right control
            if (jQuery(".column.rightCol > div").is(".boxItem") === false || jQuery(".column.rightCol > :first(.boxItem) > div").hasClass("empty") === true) {
                jQuery("#scroller .scrollRight").hide();
            }
            else {
                jQuery("#scroller .scrollRight").show();
            }
        }

        // Scroll the sub pop up left or right
        function scrollRollover(dir) {
            var ul = jQuery("#rolloverMenu").find("ul");
            var left = isNaN(parseFloat(ul.css("left"))) ? 0 : parseFloat(ul.css("left"));
            switch (dir) {
                case "left":
                    if (left * -1 > 0)
                        ul.css("left", (left + 90) + "px");
                    break;
                case "right":
                    if (left * -1 < (ul.children().length - 3) * 92)
                        ul.css("left", (left - 90) + "px");
                    break;
                default:
                    // Do nothing
                    break;
            }
        }

        // This is just a temporary update function till I can come up with a better name
        function tempUpdateFunction(loc) {
            var marketer = loc;

            // Update the middle column
            selected = marketer;
            setSelectedInfo(marketer);
            updateRightColumn(marketer);
            scroll();
        }

        // Generate a required ranks list
        // @marketer: A marketer object
        function generateRequiredRanksList(marketer) {
            var adjust = [0]; // Helps with the rank requirement adjustment per leg
            var requiredRanks = [];

            // Loop through all the possible ranks i is the RankID
            for (var i = 14; i > 0; i--) {
                // Find the requirements for the desired rank
                var loopThis = findLegRankRequirement(marketer.desiredRank, i);

                // Loop only if there is a reason to, meaning there is a requirement
                if (loopThis > 0) {
                    // The adjustment accounts for the nested duplicates
                    for (var n = 0; n < (loopThis - adjust[adjust.length - 1]); n++) {
                        // Find each proper rank
                        var x = 0; do {
                            if (ranks[x].RankID == i) {
                                requiredRanks.push(ranks[x].RankID);
                            }
                        } while ((x = x + 1) < ranks.length);
                    }
                    adjust.push(loopThis);
                }
            }

            return requiredRanks;
        }

        // Peruse the downline and find the best matches for each spot required
        function generateRecommendedList(marketer, requiredranks) {
            // Only do work if you have to
            if (requiredranks.length > 0) {
                // Initialize the potential marketer list, recommended list(s), and creating a copy of the required ranks
                var potentialList = [],
					recommendedList = [],
					stateContext = state[root.UniqueAccountID],
					requiredRanks = requiredranks.slice(0);

                // Creating this inner function to isolate from the global scope to add a marketer to the recommended list
                var addToList = function(innerMarketer) {
                    var isset = false;
                    // Add the most capable marketer to the recommended list and remove the slot they are taking
                    for (var i = 0; i < recommendedList.length; i++) {
                        if (typeof recommendedList[i] === "undefined") {
                            recommendedList[i] = innerMarketer;
                            isset = true;
                            break;
                        }
                    }

                    // Add to the end of the list if not already set
                    if (!isset) {
                        recommendedList.push(innerMarketer);
                    }
                };

                // Check a rank to ensure overflow can be qualified
                var qualified = function(rankid) {
                    // Rank passed in
                    var rank = findRankById(rankid),
                    // Store the bronze rank sequence
						bronzeSeq = null;

                    // Find bronze rank
                    for (var i = 0; i < ranks.length; i++) {
                        if (ranks[i].RankName === "Bronze Director") {
                            bronzeSeq = ranks[i].RankSeq;
                        }
                    }

                    // Return if its under or at bronze
                    return (rank.RankSeq <= bronzeSeq);
                };

                // Find the marketer's sorted front line marketers for reference
                var frontline = (function(marketer) {
                    // Start with an unsorted frontline list
                    var frontline = findFrontLine.call([], marketer.Leg, marketer.AbsLevel);

                    // Assign a leg rank sequence to each marketer on the frontline
                    var len = frontline.length; while (len--) {
                        var innerMarketer = frontline[len];
                        //if (innerMarketer.UniqueAccountID.slice(-1) === "O") {
                        //    frontline.splice(len, 1);
                        //    len = len - 1;
                        //}
                        innerMarketer.RankSeq = findRankById(innerMarketer.LegRankID).RankSeq;
                        innerMarketer.LegRankSeq = findRankById(innerMarketer.LegRankID).RankSeq;
                    }

                    // Sort the front line by LegRankSeq
                    return sort(frontline, sortRanks);
                })(marketer);

                // Load a marketer from save/pin
                if (typeof stateContext !== "undefined") {
                    for (var i = 0; i < stateContext.length; i++) {
                        if (typeof stateContext[i] !== "undefined") {
                            if (stateContext[i].parent === marketer.UniqueAccountID) {
                                // Find the marketer
                                var tempMarketer = findMarketer(stateContext[i].marketer);
                                tempMarketer.desiredRank = requiredranks[stateContext[i].position];
                                tempMarketer.calcCGV();
                                tempMarketer.pinned = true;
                                
                                // Get marketers calculated upline
                                if(!compareArray(stateContext[i].upline, createUpLineArray(tempMarketer))) {
                                    jQuery(".ModalMessage.invalid").modalize({ "selector": ".invalid", "text": "Invalid save data." }).trigger("click");
                                    return false;
                                }

                                // Remove the rank from the list
                                delete requiredRanks[stateContext[i].position];
                                recommendedList[stateContext[i].position] = tempMarketer;

                                // Find the existing leg and remove it
                                var breakLoop = false;
                                for (var n = 0; n < frontline.length; n++) {
                                    var search = findMarketers.call([], frontline[n].Leg);
                                    search.push(frontline[n]);

                                    // Search through an entire front line to find a match	
                                    var fLen = search.length; while (fLen--) {
                                        if (search[fLen].UniqueAccountID === tempMarketer.UniqueAccountID) {
                                            recommendedList[stateContext[i].position].legid = frontline.splice(n, 1)[0].legid;
                                            breakLoop = true;
                                            break;
                                        }
                                    }

                                    // End the outer loop to save resource cycles
                                    if (breakLoop)
                                        break;
                                }
                            }
                        }
                    }
                }

                // Loop through each required rank initially - 1st phase
                for (var i = 0, len = requiredRanks.length; i < len; i++) {
                    // Create a temporary potential list for each rank
                    var tempPotentialList = [];

                    // If we exhaust the front line end the search, resource saving
                    if (frontline.length < 1)
                        break;

                    // Initialize the matching front line list
                    var matchingFrontline = [];

                    // Check if this rank has already been accounted for from a previous insertion
                    if (typeof requiredRanks[0] === "undefined") {
                        requiredRanks.splice(0, 1); // Remove the required rank from the list
                        continue; 					// and continue...
                    }

                    // Test if anyone in the frontline has a match
                    for (var n = 0; n < frontline.length; n++) {
                        var uuid = Math.random() * +new Date();
                        frontline[n].uuid = uuid;
                        // If there is a match remove it from the available front lines and insert into matches
                        if (frontline[n].LegRankSeq >= findRankById(requiredRanks[0]).RankSeq)
                            matchingFrontline.push(frontline[n]);
                    }

                    // For each leg that matches
                    for (var n = 0; n < matchingFrontline.length; n++) {
                        // Find all marketers by the legrankid rank, and assign them with the proper leg identification
                        var matches = findMarketersByRank.call([], matchingFrontline[n].Leg, matchingFrontline[n].LegRankID);

                        // Only add if front line is of same rank, put at the top of the precedence list
                        if (matchingFrontline[n].RankID === matchingFrontline[n].LegRankID)
                            matches.splice(0, 0, matchingFrontline[n]);

                        // Update each marketer in this leg with the proper desired rank and calculate the proper CGV on the correct number of levels
                        for (var x = 0; x < matches.length; x++) {
                            var match = matches[x];
                            match.desiredRank = requiredRanks[0];
                            match.uuid = matchingFrontline[n].uuid;
                            match.RankSeq = findRankById(match.RankID).RankSeq;
                            match.calcCGV();
                        }

                        // Sort the matches
                        matches = sort(matches, marketerCGV);

                        // Move the closest marketer to the front if CGV matches				
                        for (var x = 1; x < matches.length; x++) {
                            if (matches[0].AbsLevel > matches[x].AbsLevel && matches[0].cgv === matches[x].cgv) {
                                matches[0] = matches[x];
                            }
                        }

                        // Find the marketer with the most CGV and add to the temp list		
                        tempPotentialList.push(matches[0]);
                    }

                    // Sort the temporary potential list by CGV
                    tempPotentialList = sort(tempPotentialList, marketerCGV);

                    // Continue if there are no marketers in the list
                    if (!tempPotentialList.length)
                        continue;

                    // Add to the recommended list
                    addToList(tempPotentialList[0]);

                    // Remove the correct matching frontline
                    for (var n = 0; n < frontline.length; n++) {
                        if (frontline[n].uuid === tempPotentialList[0].uuid) {
                            frontline.splice(n, 1);
                            break;
                        }
                    }

                    // Remove the rank from the required list
                    requiredRanks.shift();
                }

                // Loop through each required rank to find the best match per slot - 2nd phase
                for (var i = 0, len = requiredRanks.length; i < len; i++) {
                    // If we exhaust the front line end the search
                    if (frontline.length < 1)
                        break;

                    // Check if this rank has already been accounted for from a previous load state match
                    if (typeof requiredRanks[0] === "undefined")
                        continue;

                    var tempPotentialList = [];
                    for (var n = 0; n < frontline.length; n++) {
                        // Obtain all marketers under the given frontline marketer and assign the correct leg id
                        var matches = findMarketersByRank.call([], frontline[n].Leg, frontline[n].LegRankID);
                        var uuid = Math.random() * +new Date();
                        frontline[n].uuid = uuid;

                        // Add in the frontline marketer only if the rank i'ds match
                        if (frontline[n].RankID === frontline[n].LegRankID)
                            matches.splice(0, 0, frontline[n]);

                        // Update each marketer in this leg with the proper desired rank and calculate the proper CGV on the correct number of levels
                        for (var x = 0; x < matches.length; x++) {
                            var match = matches[x];
                            match.desiredRank = requiredRanks[0];
                            match.calcCGV();
                            match.uuid = uuid;
                        }

                        // Restart the loop if no markters exist in the list
                        if (!matches.length)
                            continue;

                        // Sort the matches by CGV to get the best possible candidate
                        matches = sort(matches, marketerCGV);

                        // Move the closest marketer to the front if CGV matches				
                        for (var x = 1; x < matches.length; x++) {
                            if (matches[0].AbsLevel > matches[x].AbsLevel && matches[0].cgv === matches[x].cgv) {
                                matches[0] = matches[x];
                            }
                        }

                        // Add the RankSeq for sorting after this loop
                        matches[0].RankSeq = findRankById(matches[0].RankID).RankSeq;

                        // Add to the potential list
                        tempPotentialList.push(matches[0]);
                    }

                    // If there aren't any results -- unlikely, restart the loop
                    if (!tempPotentialList.length)
                        continue;

                    // Sort the best potential candidates
                    tempPotentialList = sort(tempPotentialList, ranksAndCGV);

                    // Add the most capable marketer to the recommended list and remove the slot they are taking
                    addToList(tempPotentialList[0]);

                    // Remove the correct frontline
                    for (var n = 0; n < frontline.length; n++) {
                        if (frontline[n].uuid === tempPotentialList[0].uuid) {
                            frontline.splice(n, 1);
                            break;
                        }
                    }

                    // Remove rank from the list
                    requiredRanks.shift();
                }

                // Loop through the rest of the legs, sort by rank and add the highest to a potential list (aggregate) - 3rd phase
                for (var i = 0, len = frontline.length; i < len; i++) {
                    // End the loop if there are no more marketers to search
                    if (!frontline.length)
                        break;

                    // Find all downline marketers from this frontline match and add the existing frontline to the list
                    var matches = findMarketers.call([], frontline[0].Leg);
                    matches.splice(0, 0, frontline[0]);

                    // Assign the rank sequence for sorting purposes (ahead of time for speed)
                    for (var n = 0; n < matches.length; n++) {
                        matches[n].RankSeq = findRankById(matches[n].RankID).RankSeq;
                        if (!matches[n].cgv) {
                            matches[n].cgv = matches[n].TotalComVol;
                        }
                    }

                    // Sort the matches by rank and cgv
                    matches = sort(matches, ranksAndCGV);

                    // Move the closest marketer to the front if CGV matches				
                    for (var x = 1; x < matches.length; x++) {
                        if (matches[0].AbsLevel > matches[x].AbsLevel && matches[0].cgv === matches[x].cgv) {
                            matches[0] = matches[x];
                        }
                    }

                    if (matches.length > 0) {
                        potentialList.push(matches[0]);
                        frontline.splice(0, 1);
                    }
                }

                // If we have marketers to add
                if (potentialList.length > 0) {
                    // Sort the potential list by rank and CGV
                    potentialList = sort(potentialList, ranksAndCGV);

                    // Add overflow marketers
                    for (var i = 0, len = potentialList.length; i < len; i++) {
                        // Add marketer to the recommended list
                        addToList(potentialList.shift());

                        // Remove the rank from the list
                        requiredRanks.shift();
                    }
                }

                // Apply the wrapper to each element to be shown immmediately
                for (var i = 0, len = requiredranks.length; i < len; i++) {
                    if (typeof recommendedList[i] !== "undefined") {
                        var potential = { "marketer": recommendedList[i], "leg": recommendedList[i].legid, "color": "red" };

                        if (typeof recommendedList[i].pinned !== "undefined") {
                            potential.pinned = true;
                            recommendedList[i].pinned = undefined;
                        }

                        potential["marketer"].desiredRank = requiredranks[i];
                        potential["marketer"].calcCGV();

                        // Remove overflow if not qualified
                        if (potential["marketer"].UniqueAccountID.slice(-1) === "O" && !qualified(requiredranks[i])) {
                            continue;
                        }

                        // Apply color
                        if (typeof potential.color === "undefined")
                            potential.color = "red";
                        if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                            potential.color = "yellow";
                        else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                            potential.color = "green";

                        recommendedList[i] = potential;
                    }
                }

                // Apply to remaining elements
                for (var i = requiredranks.length, len = recommendedList.length; i < len; i++) {
                    if (typeof recommendedList[i] !== "undefined") {
                        recommendedList[i].desiredRank = requiredranks[requiredranks.length - 1];
                        recommendedList[i].calcCGV();
                        var potential = { "marketer": recommendedList[i], "leg": recommendedList[i].legid, "color": "red" };
                        recommendedList[i] = potential;
                    }
                }
            }

            // Return the correct list
            return recommendedList;
        }

        // Update the middle column based on a marketer
        function updateMiddleColumn(marketer, selectedMarketer, color) {
            // Generate required ranks
            var requiredRanks = generateRequiredRanksList(marketer),
            // Generate the list for the selectedMarketer person
				requiredRanksLength = requiredRanks.length,
            // recommendedList initialization
				recommendedList = generateRecommendedList(marketer, requiredRanks, "m"),
            // Various variables
				midCol = "",
				i = 0,
				len = requiredRanksLength,
				selSet = false,
				selectedSet = false;

            // Middle column first
            jQuery(".column.midCol").children(".boxItem").remove();

            // Loop through all requiredRanks
            var n = 0;
            while (i < len) {
                if (typeof recommendedList[i] !== "undefined") {
                    // Set the recommended as the first if undefined
                    if (typeof selectedMarketer === "undefined" && i === 0) {
                        selected = recommendedList[0].marketer;
                        setSelectedInfo(selected, true, recommendedList[0].color, recommendedList[0].pinned, (selected.UniqueAccountID.slice(-1) === "O"));
                        updateRightColumn(selected);

                        selectedSet = true;

                        // for this part need an extra layer of complexity
                        var tempMarketer = findMarketer(recommendedList[0]["marketer"].UniqueAccountID);
                        // Figure out if the triangle is needed here
                        tempMarketer.findDistanceLine(undefined, marketer.UniqueAccountID, []);

                        var distance = tempMarketer.distanceLine.length;
                        if (distance > 0)
                            jQuery("<div class='triangle " + convertNumberToString(distance) + "'>" + distance + "</div>").insertBefore(jQuery(".yourGoalsMarker > .boxTop"));
                    }
                    else if (typeof selectedMarketer !== "undefined" && recommendedList[i]["marketer"].UniqueAccountID === selectedMarketer.UniqueAccountID) {
                        if (selSet === false) {
                            selectedMarketer = recommendedList[i].marketer;
                            setSelectedInfo(selectedMarketer, true, color, recommendedList[i].pinned, (selectedMarketer.UniqueAccountID.slice(-1) === "O"));
                            updateRightColumn(selectedMarketer);
                            selectedSet = true;
                            selSet = true;
                        }
                    }
                    else {
                        // for this part need an extra layer of complexity
                        var tempMarketer = recommendedList[i]["marketer"];
                        // Figure out if the triangle is needed here
                        tempMarketer.findDistanceLine(undefined, breadcrumbs[breadcrumbs.length - 1].UniqueAccountID, []);
                        var distance = tempMarketer.distanceLine.length;
                        var triangle = (distance > 0) ? "<div class='triangle " + convertNumberToString(distance) + "'>" + distance + "</div>" : "";

                        if (selectedSet === false) {
                            jQuery(createBoxItem(recommendedList[i].marketer, "m", recommendedList[i].color, triangle, recommendedList[i].pinned)).insertBefore(".yourGoalsMarker");
                        }
                        else {
                            var $placeholder = jQuery(".column.midCol .yourGoalsMarker");
                            if ($placeholder.nextAll(".boxItem:not(.bottom)").length) {
                                $placeholder = $placeholder.nextAll(".boxItem:not(.bottom):last");
                            }

                            jQuery(createBoxItem(recommendedList[i].marketer, "m", recommendedList[i].color, triangle, recommendedList[i].pinned)).insertAfter($placeholder);
                        }
                    }
                }
                else {
                    jQuery(".column.midCol").append(jQuery("<div class='boxItem gray'>" +
						"<div class='empty'><img alt='' class='ModalEnabler' id='addMarketerBtn' src='includes/images/downline_tools/rightcol/btn-add_new_marketer.png'/></div>" +
						"<p class='currently'><span>Currently </span>Empty</p>" +
						"<p class='desired'><span>Desired </span>" + translateRank(requiredRanks[recommendedList.length + n]) + "</p>" +
						"</div>")
					);
                    n++;
                }
                i++;
            }

            // Overflow for the middle column
            if (recommendedList.length > requiredRanksLength) {
                var original = i;
                var additional = (i + 3);
                additional = (additional > recommendedList.length) ? recommendedList.length : additional;

                var bottomHTML = "";
                for (i = original; i < additional; i++) {
                    var tempMarketer = recommendedList[i].marketer;

                    bottomHTML += "<li id='t_" + tempMarketer.UniqueAccountID + "' class='gray'><div class='inner'><span class='Rank'>" + modifyStarRank(translateRank(tempMarketer.RankID, true)).replace(" Director", "") + "</span><div><img height='35' src='GenericImageEditor/imagehandler.aspx?id=" + tempMarketer.AccountID + "' />" +
								"</div><strong>" + convertNameToFirstLast(tempMarketer.AccountName).substring(0, 12) + "<br />CGV " + formatComma(+tempMarketer.cgv) + "</strong></div></li>";
                }

                jQuery("#bottomMenu").find("ul").html(bottomHTML);

                jQuery('<div class="boxItem bottom middle"><div class="triangle">' + (i - original) + '</div></div>').appendTo(".column.midCol");
            }


            bindMidColEvents();
        }

        // Update the right column based on a marketer
        function updateRightColumn(marketer) {
            // Only for overflow accounts
            if (selected.UniqueAccountID.slice(-1) === "O") {
                var $rightColumn = jQuery(".column.rightCol");
                $rightColumn.html("");
                $rightColumn.append(jQuery("<div class='no-further'/>"));

                return false;
            }

            // Generate required ranks
            var requiredRanks = generateRequiredRanksList(marketer),
            // Generate the list for the selected person
				requiredRanksLength = requiredRanks.length,
				recommendedList = (marketer.desiredRank > 3) ? generateRecommendedList(marketer, requiredRanks, "r") : [];

            // Clear out the column
            var rightCol = "";
            jQuery("#levels ul").html("");
            var i = 0; do {
                var temp = recommendedList[i];
                if (typeof temp !== "undefined") {
                    // for this part need an extra layer of complexity
                    var tempMarketer;
                    if (typeof temp["marketer"] !== "undefined")
                        tempMarketer = findMarketer(recommendedList[i]["marketer"].UniqueAccountID);
                    else
                        tempMarketer = findMarketer(recommendedList[i].UniqueAccountID);

                    // Figure out if the triangle is needed here
                    tempMarketer.findDistanceLine(undefined, marketer.UniqueAccountID, []);
                    var distance = tempMarketer.distanceLine.length;
                    var triangle = (distance > 0) ? "<div class='triangle'>" + distance + "</div>" : "";

                    rightCol += createBoxItem(recommendedList[i].marketer, "r", recommendedList[i].color, triangle, recommendedList[i].pinned);
                }
            } while ((i = i + 1) < requiredRanksLength);

            jQuery(".column.rightCol").html(rightCol);

            // Right column overflow -- should be the same as the middle column
            if (recommendedList.length > requiredRanksLength) {
                var original = i;
                var additional = (i + 3);
                additional = (additional > recommendedList.length) ? recommendedList.length : additional;

                var bottomHTML = "";
                for (i = original; i < additional; i++) {
                    var tempMarketer = recommendedList[i].marketer;

                    bottomHTML += "<li id='t_" + tempMarketer.UniqueAccountID + "' class='gray'><div class='inner'><span class='Rank'>" + modifyStarRank(translateRank(tempMarketer.RankID, true)) + "</span><div><img height='35' src='GenericImageEditor/imagehandler.aspx?id=" + tempMarketer.AccountID + "' />" +
								"</div><strong>" + convertNameToFirstLast(tempMarketer.AccountName).substring(0, 12) + "<br />CGV " + formatComma(+tempMarketer.cgv) + "</strong></div></li>";
                }

                jQuery("#bottomMenuRight").find("ul").html(bottomHTML);

                jQuery('<div class="boxItem bottom right"><div class="triangle">' + (i - original) + '</div></div>').appendTo(".column.rightCol");
            }

            bindRightColEvents();

            // Bind the 4th col events
            bindFourthColEvents();

            // Show the add marketer button
            if (requiredRanksLength < 1)
                jQuery(".column.rightCol").append(jQuery("<div class='no-further'/>"));

            if (findRankById(marketer.RankID).RankSeq < findRankById(marketer.desiredRank).RankSeq) {
                var i = 0; while (requiredRanksLength > recommendedList.length) {
                    jQuery(".column.rightCol").append(jQuery("<div class='boxItem gray'>" +
                                                "<div class='empty'><img alt='' class='ModalEnabler' id='addMarketerBtn' src='includes/images/downline_tools/rightcol/btn-add_new_marketer.png'/></div>" +
                                                "<p class='currently'><span>Currently </span>Empty</p>" +
                                                "<p class='desired'><span>Desired </span>" + translateRank(requiredRanks[recommendedList.length + i]) + "</p>" +
                                                "</div>")
                    );

                    i = i + 1;
                    requiredRanksLength = requiredRanksLength - 1;
                }
            }
        };

        // Bind the right column events
        function bindRightColEvents() {
            // Caching selector for a noticeable speed improvement
            var $rightColBoxItems = jQuery(".column.rightCol .boxItem:not(.bottom, .gray)");

            // Always have the box item selected on top
            $rightColBoxItems.mousedown(function() {
                jQuery(this).addClass("top");

                jQuery("#rolloverMenu").hide();

                return false;
            });

            $rightColBoxItems.parent().bind("mousedown", function() {
                return false;
            });

            $rightColBoxItems.mousedown(function(evt) {
                evt.preventDefault();
                return false;
            });

            $rightColBoxItems.disableSelection();

            // And remove when released
            $rightColBoxItems.mouseup(function() {
                jQuery(this).removeClass("top");
            });

            // Attach the drag and drop events
            $rightColBoxItems.draggable({ revert: true, drag: rightColDrag });
            $rightColBoxItems.droppable({
                tolerance: 'pointer',
                accept: '.column.rightCol .boxItem:not(.gray), .MiniBoxItems li',
                drop: rightColDrop
            });
        };

        // Bind events required to show the 4th column
        function bindFourthColEvents() {
            // Caching selector for a noticeable speed improvement
            var $fourthColBoxItems = jQuery(".column.rightCol .boxItem:not(.bottom)");

            // Show the 4th column
            $fourthColBoxItems.mouseenter(function() {
                clearTimeout(fourth);

                var that = this;
                fourth = window.setTimeout(function() {
                    bind(that, showFourthCol);
                }, 100);
            });

            // Hide the column
            $fourthColBoxItems.mouseleave(function() {
                window.clearTimeout(fourth);
                jQuery("#levels").hide();
            });
        };

        // Handles the right column dragging
        function rightColDrag(evt, ui) {
            window.clearTimeout(fourth);
            jQuery("#levels").hide();
        };

        // Handles the right column dropping and rebinding
        function rightColDrop(evt, ui) {
            if (jQuery(this).find(".lock").hasClass("pinned"))
                return false;

            // Coming from a mini box item
            if (ui.draggable.attr("id").substring(0, 1) === "t") {
                var dropMarketer = findMarketer(jQuery(this).attr("id").substr(2));
                var dragMarketer = findMarketer(ui.draggable.attr("id").substr(2));

                // Do not allow any drops unless in right column
                if (ui.draggable.data("col") !== "r")
                    return false;

                // Do this to only keep marketers of the same level within a given drag
                if (ui.draggable.parents(".rolloverMenu").attr("id") === "rolloverMenu") {
                    // Ensure the correct box item has been landed on for the mini box item
                    if (ui.draggable.data("ref") !== this)
                        return false;
                }

                dragMarketer.findDistanceLine(undefined, selected.UniqueAccountID, []);
                var distance = dragMarketer.distanceLine.length;
                var triangle = (distance > 0) ? "<div class='triangle'>" + distance + "</div>" : "";
                var dropBoxItem = jQuery(createBoxItem(dropMarketer, "r", getColorFromClass(jQuery(this)), (jQuery(this).find(".triangle").length > 0) ? "<div class='triangle'>" + jQuery(this).find(".triangle").text() + "</div>" : ""));
                var dragBoxItem = jQuery(createBoxItem(dragMarketer, "r", getColorFromClass(ui.draggable), triangle));
                var swap = dropBoxItem.find(".desired").html();

                // Now change the desired rank and color for the drag marketer
                potential = { "marketer": dragMarketer, "color": undefined };
                potential["marketer"].desiredRank = translateRank(swap.substr(swap.lastIndexOf(">") + 1));
                potential["marketer"].calcCGV();
                if (typeof potential.color === "undefined")
                    potential.color = "red";
                if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                    potential.color = "yellow";
                else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                    potential.color = "green";

                dragBoxItem.attr("class", "boxItem ui-draggable ui-droppable");
                dragBoxItem.addClass(potential.color);
                dragBoxItem.find(".desired").html(swap);
                dragBoxItem.find(".cgv").html("CGV: " + formatComma(potential["marketer"].cgv));

                dropBoxItem = jQuery("<li id='t_" + dropMarketer.UniqueAccountID + "' class='gray'><div class='inner'><span class='Rank'>" + modifyStarRank(translateRank(dropMarketer.RankID, true)) + "</span><div><img height='35' src='GenericImageEditor/imagehandler.aspx?id=" + dropMarketer.AccountID + "' />" +
								"</div><strong>" + convertNameToFirstLast(dropMarketer.AccountName).substring(0, 12) + "<br />CGV " + formatComma(+dropMarketer.cgv) + "</strong></div></li>");

                // Replace elements
                var old = jQuery(this).replaceWith(dragBoxItem);
                ui.draggable.replaceWith(dropBoxItem);

                jQuery(".column.rightCol .boxItem:not(.bottom)").draggable({ revert: true });
                jQuery(".column.rightCol > .boxItem:not(.bottom)").droppable({
                    tolerance: 'pointer',
                    accept: '.column.rightCol .boxItem, .MiniBoxItems li',
                    drop: rightColDrop
                });

                // Bind the 4th column events
                bindFourthColEvents();

                return false;
            }
            var dropMarketer = findMarketer(jQuery(this).attr("id").substr(2));
            var dragMarketer = findMarketer(ui.draggable.attr("id").substr(2));

            var dropBoxItem = jQuery(createBoxItem(dropMarketer, "r", getColorFromClass(jQuery(this)), (jQuery(this).find(".triangle").length > 0) ? "<div class='triangle'>" + jQuery(this).find(".triangle").text() + "</div>" : ""));
            var dragBoxItem = jQuery(createBoxItem(dragMarketer, "r", getColorFromClass(ui.draggable), (ui.draggable.find(".triangle").length > 0) ? "<div class='triangle'>" + ui.draggable.find(".triangle").text() + "</div>" : ""));

            // Change the desired rank and color for the drop marketer
            var potential = { "marketer": dropMarketer, "color": undefined };
            var tmp = dragBoxItem.find(".desired").html();
            potential["marketer"].desiredRank = translateRank(tmp.substr(tmp.lastIndexOf(">") + 1));
            potential["marketer"].calcCGV();
            if (typeof potential.color === "undefined")
                potential.color = "red";
            if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                potential.color = "yellow";
            else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                potential.color = "green";

            dropBoxItem.attr("class", "boxItem ui-draggable ui-droppable");
            dropBoxItem.addClass(potential.color);
            var swap = dropBoxItem.find(".desired").html();
            dropBoxItem.find(".desired").html(dragBoxItem.find(".desired").html());
            dropBoxItem.find(".cgv").html("CGV: " + formatComma(potential["marketer"].cgv));

            // Now change the desired rank and color for the drag marketer
            potential = { "marketer": dragMarketer, "color": undefined };
            potential["marketer"].desiredRank = translateRank(swap.substr(tmp.lastIndexOf(">") + 1));
            potential["marketer"].calcCGV();
            if (typeof potential.color === "undefined")
                potential.color = "red";
            if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                potential.color = "yellow";
            else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                potential.color = "green";

            dragBoxItem.attr("class", "boxItem ui-draggable ui-droppable");
            dragBoxItem.addClass(potential.color);
            dragBoxItem.find(".desired").html(swap);
            dragBoxItem.find(".cgv").html("CGV: " + formatComma(potential["marketer"].cgv));

            var old = jQuery(this).replaceWith(dragBoxItem);
            ui.draggable.replaceWith(dropBoxItem);

            bindRightColEvents();

            // Bind the 4th column events
            bindFourthColEvents();
        }

        // The drop event for your goals marker selected state
        function yourGoalsMarkerDrop(evt, ui) {
            if (jQuery(this).find(".lock").hasClass("pinned"))
                return false;
            
            // For middle marketers
            if (ui.draggable.attr("id").substring(0, 1) === "m") {
                var dragged = findMarketer(ui.draggable.attr("id").substr(2)), // Dragged
                    dropped = findMarketer(jQuery(this).attr("id").substr(2)), // Dropped
                    parent = breadcrumbs[breadcrumbs.length - 1];
                selected = dragged;

                // Figure out if the triangle is needed here
                dropped.findDistanceLine(undefined, parent.UniqueAccountID, []);
                var distance = dropped.distanceLine.length,
                    triangle = (distance > 0) ? "<div class='triangle " + convertNumberToString(distance) + "'>" + distance + "</div>" : "",
                // Cache dragged desired rank
                    swap = dragged.desiredRank;

                // Swap ranks
                dragged.desiredRank = dropped.desiredRank;
                dropped.desiredRank = swap;

                // Set proper color and rank for dropped
                var color = undefined;
                if (typeof color === "undefined")
                    color = "red";
                if (closeToRank(dropped, dropped.desiredRank))
                    color = "yellow";
                else if (attainedRank(dropped.RankID, dropped.desiredRank))
                    color = "green";

                // Generate the new boxitem
                var boxItem = createBoxItem(dropped, "m", color, triangle),

                // Set proper color and rank for dragged
                color = undefined;
                if (typeof color === "undefined")
                    color = "red";
                if (closeToRank(dragged, dragged.desiredRank))
                    color = "yellow";
                else if (attainedRank(dragged.RankID, dragged.desiredRank))
                    color = "green";
                    
                setSelectedInfo(dragged, true, color, false, (dragged.UniqueAccountID.slice(-1) === "O") ? true : false);
                ui.draggable.replaceWith(boxItem);

                updateRightColumn(dragged);
            }
            // For the triangle rollover marketers
            else if (ui.draggable.attr("id").substring(0, 1) === "t") {
                if (ui.draggable.data("col") === "m")
                    return false;

                var marketer = findMarketer(ui.draggable.attr("id").substr(2));
                marketer.desiredRank = findMarketer(jQuery(this).attr("id").substr(2)).desiredRank;
                marketer.calcCGV();
                selected = marketer;

                var selectedMarketer = findMarketer(this.id.substr(2));

                var color = "red";
                if (typeof color === "undefined")
                    color = "red";
                if (closeToRank(marketer, marketer.desiredRank))
                    color = "yellow";
                else if (attainedRank(marketer.RankID, marketer.desiredRank))
                    color = "green";

                // Create box item to swap
                var dropBoxItem = jQuery("<li id='t_" + selectedMarketer.UniqueAccountID + "' class='gray'><div class='inner'><span class='Rank'>" + modifyStarRank(translateRank(selectedMarketer.RankID, true)) + "</span><div><img height='35' src='GenericImageEditor/imagehandler.aspx?id=" + selectedMarketer.AccountID + "' />" +
								"</div><strong>" + convertNameToFirstLast(selectedMarketer.AccountName).substring(0, 12) + "<br />CGV " + formatComma(+selectedMarketer.cgv) + "</strong></div></li>");

                // Replace elements
                ui.draggable.replaceWith(dropBoxItem);
                setSelectedInfo(selected, true, color);
                updateRightColumn(marketer);
            }
            // For right marketers
            else {
                var marketer = findMarketer(ui.draggable.attr("id").substr(2));
                selected = marketer;

                marketer.desiredRank = findMarketer(jQuery(this).attr("id").substr(2)).desiredRank;
                marketer.calcCGV();

                var color = "red";

                if (typeof color === "undefined")
                    color = "red";
                if (closeToRank(marketer, marketer.desiredRank))
                    color = "yellow";
                else if (attainedRank(marketer.RankID, marketer.desiredRank))
                    color = "green";

                setSelectedInfo(selected, true, color);
                updateRightColumn(marketer);
            }

            // Put here for now
            scroll();

            bindMidColEvents();
        }

        // Handles the middle column dropping and rebinding
        function midColDrop(evt, ui) {
            if (jQuery(this).find(".lock").hasClass("pinned")) {
                return false;
            }
            // Coming from a mini box item
            if (ui.draggable.attr("id").substring(0, 1) === "t") {
                var dropMarketer = findMarketer(jQuery(this).attr("id").substr(2));
                var dragMarketer = findMarketer(ui.draggable.attr("id").substr(2));

                // Do not allow any drops unless in middle column
                if (ui.draggable.data("col") !== "m")
                    return false;

                // Do this to only keep marketers of the same level within a given drag
                if (ui.draggable.parents(".rolloverMenu").attr("id") === "rolloverMenu") {
                    // Ensure the correct box item has been landed on for the mini box item
                    if (ui.draggable.data("ref") !== this)
                        return false;
                }

                dragMarketer.findDistanceLine(undefined, breadcrumbs[breadcrumbs.length - 1].UniqueAccountID, []);
                var distance = dragMarketer.distanceLine.length;
                var triangle = (distance > 0) ? "<div class='triangle'>" + distance + "</div>" : "";

                var dropBoxItem = jQuery(createBoxItem(dropMarketer, "m", getColorFromClass(jQuery(this)), (jQuery(this).find(".triangle").length > 0) ? "<div class='triangle'>" + jQuery(this).find(".triangle").text() + "</div>" : ""));
                var dragBoxItem = jQuery(createBoxItem(dragMarketer, "m", getColorFromClass(ui.draggable), triangle));

                var swap = dropBoxItem.find(".desired").html();

                // Now change the desired rank and color for the drag marketer
                potential = { "marketer": dragMarketer, "color": undefined };
                potential["marketer"].desiredRank = translateRank(swap.substr(swap.lastIndexOf(">") + 1));
                potential["marketer"].calcCGV();
                if (typeof potential.color === "undefined")
                    potential.color = "red";
                if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                    potential.color = "yellow";
                else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                    potential.color = "green";

                dragBoxItem.attr("class", "boxItem ui-draggable ui-droppable");
                dragBoxItem.addClass(potential.color);
                dragBoxItem.find(".desired").html(swap);
                dragBoxItem.find(".cgv").html("CGV: " + formatComma(potential["marketer"].cgv));

                dropBoxItem = jQuery("<li id='t_" + dropMarketer.UniqueAccountID + "' class='gray'><div class='inner'><span class='Rank'>" + modifyStarRank(translateRank(dropMarketer.RankID, true)) + "</span><div><img height='35' src='GenericImageEditor/imagehandler.aspx?id=" + dropMarketer.AccountID + "' />" +
								"</div><strong>" + convertNameToFirstLast(dropMarketer.AccountName).substring(0, 12) + "<br />CGV " + formatComma(+dropMarketer.cgv) + "</strong></div></li>");

                // Replace elements
                var old = jQuery(this).replaceWith(dragBoxItem);
                ui.draggable.replaceWith(dropBoxItem);

                bindMidColEvents();

                // Bind the 4th column events
                bindFourthColEvents();

                return false;
            }
            else if (ui.draggable.attr("id").substring(0, 1) === "r") {
                return false; // not allowed to move a right col marketer here
            }
            // Get references to each marketer
            var dropMarketer = findMarketer(jQuery(this).attr("id").substr(2)),
                dragMarketer = findMarketer(ui.draggable.attr("id").substr(2)),
            // Create new objects
                dropBoxItem = jQuery(createBoxItem(dropMarketer, "m", getColorFromClass(jQuery(this)), (jQuery(this).find(".triangle").length > 0) ? "<div class='triangle'>" + jQuery(this).find(".triangle").text() + "</div>" : "")),
                dragBoxItem = jQuery(createBoxItem(dragMarketer, "m", getColorFromClass(ui.draggable), (ui.draggable.find(".triangle").length > 0) ? "<div class='triangle'>" + ui.draggable.find(".triangle").text() + "</div>" : "")),
            // Change the desired rank and color for the drop marketer
                potential = { "marketer": dropMarketer, "color": undefined },
                tmp = dragBoxItem.find(".desired").html();

            potential["marketer"].desiredRank = translateRank(tmp.substr(tmp.lastIndexOf(">") + 1));
            potential["marketer"].calcCGV();
            if (typeof potential.color === "undefined")
                potential.color = "red";
            if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                potential.color = "yellow";
            else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                potential.color = "green";

            dropBoxItem.attr("class", "boxItem");
            dropBoxItem.addClass(potential.color);
            var swap = dropBoxItem.find(".desired").html();
            dropBoxItem.find(".cgv").html("CGV: " + formatComma(potential["marketer"].cgv));
            dropBoxItem.find(".desired").html(dragBoxItem.find(".desired").html());

            // Now change the desired rank and color for the drag marketer
            potential = { "marketer": dragMarketer, "color": undefined };
            potential["marketer"].desiredRank = translateRank(swap.substr(tmp.lastIndexOf(">") + 1));
            potential["marketer"].calcCGV();
            if (typeof potential.color === "undefined")
                potential.color = "red";
            if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                potential.color = "yellow";
            else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                potential.color = "green";

            dragBoxItem.attr("class", "boxItem");
            dragBoxItem.addClass(potential.color);
            dragBoxItem.find(".cgv").html("CGV: " + formatComma(potential["marketer"].cgv));
            dragBoxItem.find(".desired").html(swap);

            var old = jQuery(this).replaceWith(dragBoxItem);
            ui.draggable.replaceWith(dropBoxItem);

            // Bind the drag drop events	
            bindMidColEvents();

            // Rebind the right col drag drop events
            bindRightColEvents();
        }

        // Middle column bind events
        function bindMidColEvents() {
            var $midColDropItems = jQuery(".column.midCol .boxItem:not(.bottom, .gray)");
            $midColDropItems.unbind("mousedown click");
            $midColDropItems.draggable({ revert: true });
            jQuery(".column.midCol .lock.pinned").parents(".boxItem").draggable("destroy");

            $midColDropItems.droppable({
                tolerance: 'pointer',
                accept: '.column.midCol .boxItem:not(.gray), .column.rightCol .boxItem, .MiniBoxItems li',
                drop: midColDrop
            });

            $midColDropItems.disableSelection();
            $midColDropItems.mousedown(function() {
                jQuery(this).addClass("top");

                jQuery("#rolloverMenu").hide();

                return false;
            });

            $midColDropItems.bind("selectselect", function() {
                return false;
            });

            $midColDropItems.mouseup(function() {
                jQuery(this).removeClass("top");
            });
        };

        // Create a box item
        function createBoxItem(marketer, col, color, triangle, pinned) {
            var lock = "",
                dragdrop = "";

            // Change to pinned state
            if (typeof pinned !== "undefined" || pinned === true) {
                lock = "<div class='lock pinned'></div>";
            }
            else {
                lock = "<div class='lock'></div>";
                dragdrop = " ui-draggable ui-droppable";
            }

            // Trim name
            var accountName = convertNameToFirstLast(marketer.AccountName).substring(0, 18);

            // Is overflow marketer
            if (marketer.UniqueAccountID.slice(-1) === "O") {
                lock = "<div class='overflow'></div>";
            }

            var width = (col === "m") ? 51 : 44;
            return "<div class='boxItem " + color + dragdrop + "' id='" + col + "_" + marketer.UniqueAccountID + "'>" +
				triangle + lock +
            //"<h1><span class='name'>" + accountName + "</span><br /><span class='cgv'>CV: " + formatComma(marketer.TotalComVol) + "</span><br/><span class='cgv'>CGV: " + formatComma(marketer.cgv) + "</span></h1>" +
                "<h1><span class='name'>" + accountName + "</span><br /><span class='cgvtest'>CV: " + formatComma(marketer.TotalQualVol) + "</span>&nbsp;<span class='cgvtest'>CGV: " + formatComma(marketer.cgv) + "</span></h1>" +
            //"<h1><span class='name'>" + accountName + "</span><br /><span class='cgvtest'>CV: " + formatComma(marketer.TotalComVol) + "</span>&nbsp;<span class='cgvtest'>CGV: " + formatComma(marketer.cgv) + "</span></h1>" +
				"<div class='button'><a href=''><img class='profileBtn' src='includes/images/downline_tools/rightcol/btn-view_profile.png' alt='' /></a></div>" +
				"<div class='image'><img width='" + width + "' height='" + width + "' src='GenericImageEditor/imagehandler.aspx?id=" + marketer.AccountID + "' /></div>" +
				"<p class='currently'><span>Currently </span>" + modifyStarRank(getFullRank(marketer.RankName), true) + "</p>" +
				"<p class='desired'><span>Desired </span>" + modifyStarRank(translateRank(marketer.desiredRank), true) + "</p>" +
				"</div>";
        }

        /* Requirement methods that use the requirements object to help make correct decisions
        ****************************************************************************/
        // Find the UNI level requirement
        function findUnilevelRequirement(rankid) {
            // Check cache
            var unilevel = cachedRequest["unilevel"][rankid];
            if (typeof unilevel === "undefined") {
                var len = requirements.length; while (len--) {
                    // Find the unilevel requirement for the given rank id
                    if (requirements[len].RankID === rankid) {
                        for (var requirement in requirements[len]) {
                            // Make sure its for a qualvol property
                            if (requirement.indexOf("QualVol") > -1 && parseFloat(requirements[len][requirement]) > 0) {
                                cachedRequest["unilevel"][rankid] = { "unilevel": requirement, "value": requirements[len][requirement] };
                                return cachedRequest["unilevel"][rankid];
                            }
                        }
                    }
                }
            }
            else if (typeof unilevel !== "undefined") {
                return unilevel;
            }

            return { "unilevel": null, "value": null };
        }

        // This method simply returns a reference to the rank requirements for a given marketer
        function findRankRequirements(rankid) {
            var i = 0; do {
                if (requirements[i].RankID == rankid) {
                    return requirements[i];
                }
            } while ((i = i + 1) < requirements.length);

            return null;
        }

        // Find CV requirement - return null if not found (should never hit)
        function findCVRequirement(_rankid) {
            var i = 0; do {
                // Find the cv requirement for the given rank id
                if (requirements[i].RankID == _rankid) {
                    return requirements[i]["QualVol"];
                }
            } while ((i = i + 1) < requirements.length);

            return null;
        }

        // Find CGV requirement - return null if not found (should never hit)
        function findCGVRequirement(rankid, unilevel) {
            // Check cache
            var cgv = cachedRequest["cgv"][rankid];
            if (typeof cgv === "undefined") {
                var len = requirements.length; while (len--) {
                    // Find the cv requirement for the given rank id
                    if (requirements[len].RankID == rankid) {
                        cachedRequest["cgv"][rankid] = requirements[len][unilevel];
                        return cachedRequest["cgv"][rankid];
                    }
                }
            }
            else if (typeof cgv !== "undefined") {
                return cgv;
            }

            return null;
        }

        // Find requirements for each leg -- return null if cannot be found (this should never happen)
        function findLegRankRequirement(_rankid, _legrankid) {
            var i = 0; do {
                if (requirements[i].RankID == _rankid) {
                    for (var requirement in requirements[i]) {
                        if (requirement.indexOf("LegRank") > -1 && requirement.indexOf("Rank" + _legrankid + "Count") > -1) {
                            return parseInt(requirements[i][requirement]);
                        }
                    }
                }
            } while ((i = i + 1) < requirements.length);

            return null;
        }

        // Get reference to rank by the rank id
        function findRankById(id) {
            for (var i = 0; i < ranks.length; i++) {
                if (ranks[i].RankID === id) {
                    return ranks[i];
                }
            }

            return findRankById(1);
        }

        // Check if a marketer is close to a given rank
        function closeToRank(marketer, desired) {
            // Make sure the marketer has not yet reached the given rank
            var c = Math.floor(findRankById(marketer.RankID).RankSeq / 100);
            var d = Math.floor(findRankById(desired).RankSeq / 100);

            if (c < d) {
                var currentCGV = marketer.cgv;
                var unilevel = findUnilevelRequirement(desired).unilevel;
                var requiredCGV = findCGVRequirement(desired, unilevel);

                // Check within 75% CGV
                if ((currentCGV / requiredCGV) * 100 >= 75) {
                    return true;
                }
            }

            return false;
        }

        // Check if a marketer has attained a rank
        function attainedRank(current, desired) {
            var c = Math.floor(findRankById(current).RankSeq / 100);
            var d = Math.floor(findRankById(desired).RankSeq / 100);
            return (c >= d);
        }

        // Sorting algorithm
        function sort(array, func) {
            var len = array.length;
            if (len < 2)
                return array;

            var pivot = Math.ceil(len / 2);
            return func(sort(array.slice(0, pivot), func), sort(array.slice(pivot), func));
        }

        /* For sorting functions:
        -	il and ir are initial counters used as index indicators for the while loops,
        -	ol and or are the size indicators of the two arrays being compared the left and right respectively,
        -	cl and cr are cached lengths for comparison after the sorting,
        -	result is a returned value merged array of the sorted results
        -	the goal is to make the property checks within the while loop
        */

        // Sort marketer list
        function marketerCGV(left, right) {
            var result = [], il = 0, ir = 0, ol = left.length, cl = left.length, or = right.length, cr = right.length;
            while (cl && cr) {
                if (left[il].cgv > right[ir].cgv) {
                    result.push(left[il]);
                    il++; cl--;
                    continue;
                }

                result.push(right[ir]);
                ir++; cr--;
            }

            result = result.concat(left.slice(il, ol), right.slice(ir, or));
            return result;
        }

        // Sort ranks
        function sortRanks(left, right) {
            var result = [], il = 0, ir = 0, ol = left.length, or = right.length;
            while ((il < ol) && (ir < or)) {
                if (left[il].RankSeq > right[ir].RankSeq) {
                    result.push(left[il]);
                    il++;
                }
                else {
                    result.push(right[ir]);
                    ir++;
                }
            }

            result = result.concat(left.slice(il, ol), right.slice(ir, or));
            return result;
        }

        // Sort on ranks and cgv
        function ranksAndCGV(left, right) {
            var result = [], il = 0, ir = 0, ol = left.length, or = right.length;
            while ((il < ol) && (ir < or)) {
                // Sort ranks first and then on cgv
                if ((left[il].RankSeq > right[ir].RankSeq) || (left[il].RankSeq === right[ir].RankSeq && left[il].cgv > right[ir].cgv)) {
                    result.push(left[il]);
                    il++;
                }
                else {
                    result.push(right[ir]);
                    ir++;
                }
            }

            result = result.concat(left.slice(il, ol), right.slice(ir, or));
            return result;
        }

        // Sort by name
        function byName(left, right) {
            var result = [], il = 0, ir = 0, ol = left.length, or = right.length;
            while ((il < ol) && (ir < or)) {
                // Sort ranks first and then on cgv
                if (left[il].name.toLowerCase() < right[ir].name.toLowerCase()) {
                    result.push(left[il]);
                    il++;
                }
                else {
                    result.push(right[ir]);
                    ir++;
                }
            }

            result = result.concat(left.slice(il, ol), right.slice(ir, or));
            return result;
        }

        // Used to show the marketers in the hover column
        function showFourthCol() {
            var undefined,
				marketer = findMarketer(jQuery(this).attr("id").substr(2)),
				requiredRanks = generateRequiredRanksList(marketer),
				requiredRanksLength = requiredRanks.length;

            // Only for overflow accounts
            if (marketer.UniqueAccountID.slice(-1) === "O") {
                return false;
            }

            var $levels = jQuery("#levels");
            $levels.show();
            $levels.css("top", (+jQuery(this).position().top) + "px");
            $levels.find("ul").html("");

            var recommendedList = (marketer.desiredRank > 3) ? generateRecommendedList(marketer, requiredRanks.slice(0), "r") : [];
            if (recommendedList.length > 0) {
                for (var i = 0; i < requiredRanksLength; i++) {
                    var rank = (translateRank(requiredRanks[i]).toLowerCase()).replace(" director", "");
                    if (recommendedList[i] !== undefined) {
                        var potential = { "marketer": recommendedList[i].marketer, "color": undefined };
                        potential["marketer"].desiredRank = requiredRanks[i];
                        potential["marketer"].calcCGV();

                        // Some color corrections
                        if (potential.color === undefined)
                            potential.color = "red";
                        if (closeToRank(potential["marketer"], potential["marketer"].desiredRank))
                            potential.color = "yellow";
                        else if (attainedRank(potential["marketer"].RankID, potential["marketer"].desiredRank))
                            potential.color = "green";

                        $levels.find("ul").append(jQuery("<li class='" + potential.color + "'>" + rank + "</li>"));
                    }
                    else {
                        $levels.find("ul").append(jQuery("<li class='gray'>" + rank + "</li>"));
                    }
                }
            }
            else {
                for (var i = 0; i < requiredRanksLength; i++) {
                    var rank = (translateRank(requiredRanks[i]).toLowerCase()).replace(" director", "");
                    jQuery("#levels").find("ul").append(jQuery("<li class='gray'>" + rank + "</li>"));
                }
            }

            //// If no ranks just show three add marketer buttons
            //if (!(requiredRanksLength > 1)) {
            //    for (var i = 0; i < 3; i++) {
            //        //jQuery("#levels").find("ul").append(jQuery("<li class='gray'>Add</li>"));
            //    }
            //}
        }

        // Binding function for timeouts
        function bind(that, func, args) {
            func.apply(that, (typeof args === "undefined") ? [] : args);
        }

        // Get the correct color from the class
        function getColorFromClass(element) {
            for (var i = 0; i < colors.length; i++) {
                if (element.hasClass(colors[i])) {
                    return colors[i];
                }
            }

            return "gray";
        }
        
        // Test equivilency between two arrays
        function compareArray(arr1, arr2) {
            // Not the same
            if(arr1.length !== arr2.length)
                return false;
            
            for(var i = 0; i<arr1.length; i++) {
                if(arr1[i] != arr2[i])
                    return false;
            }
            
            return true;
        }

        // Public properties/methods
        return {
            // Starting point of the Goal Planner application
            // @path: Absolute path of web services.
            "init": function(path) {

                // Keep-Alive
                keepAlive();

                // Basic checks to ensure variable AccountID is present and, in fact, a number.
                if (!window.AccountID || isNaN(window.AccountID)) redirectToLogin();

                // Instantiate the progress interval
                progressInterval = setInterval(function() {
                    updateProgressBar("Retrieving your downline information");
                }, 2500);

                // Ajax call to retrieve marketers downline information
                ajaxDownline(path);

                // Telerik Rad Controls helpers
                telerikHelpers();

                // Binds the proper click events to all go buttons
                bindGoButtons();

                // Binds the top center column left and right scroll buttons to the scroll action.
                jQuery("#scroller .scrollLeft, #scroller .scrollRight").click(function(evt) {
                    if (jQuery(evt.target).hasClass("scrollLeft"))
                        scroll("left");
                    else
                        scroll("right");
                });

                // Scroll left
                jQuery("#scrollLeft").click(function(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    scrollRollover("left");
                });

                // Scroll right
                jQuery("#scrollRight").click(function(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    scrollRollover("right");
                });


                // Bind middle column events
                jQuery(".column.midCol").mouseenter(function() {
                    // Bind drag drop events
                    bindMidColEvents();
                });

                // Bind right column events
                jQuery(".column.rightCol").mouseenter(function() {
                    // Bind drag drop events
                    bindRightColEvents();
                });

                // Reset to default view
                jQuery("#reset").click(function() {
                    reset();
                    return false;
                });

                // Run the load function on click
                jQuery("#load").click(load);

                jQuery(".appit > img").click(upline);

                // Close the goal tool
                jQuery("#closeToolBtn").click(function() {
                    self.close();
                });

                // Add a new marketer		
                //		jQuery("#addMarketerBtn").click(function() {
                //			window.opener.window.open("defaultfordevelopment.aspx", "_self");
                //			window.opener.window.focus();
                //			self.blur();
                //		});

                // Attach all live events
                bindLiveEvents();
            },

            // Expose the getRanks method
            "getRanks": function(isBackOffice) {
                return getRanks(isBackOffice);
            },

            // Sets the origin policy on the window
            "setWindow": function(windowObj) {
                contextWindow = windowObj;
            },

            "ranksNameChanged": ranksNameChanged,
            "ranksGoalChanged": ranksGoalChanged,
            "ranksChanged": ranksChanged,
            "searchNameClicked": searchNameClicked,
            "searchClicked": searchClicked,
            "searchGoalChanged": searchGoalChanged,
            "goalChanged": goalChanged,
            "findMarketer": findMarketer,
            "state": state,
            "findDistanceLine": findDistanceLine
        };
    } ();
})(window, undefined);

