# Discussing

* Introduction - 3 minutes
* Progression

* Laying out the filesystem - 5 minutes
* Roles of Backbone structures - 5 minutes
* Separating structures with modules - 10 minutes
* Rendering templates - 10 minutes

# Introduction

* Discuss name
* Job role :: JavaScript developer && Training
* Backbone.js role
  + Triaging Backbone bugs
  + Helping out in IRC and Google Groups

# Organization, what?

* Backbone is a *library* not a *framework*
  + Does not enforce restrictions
  + Frameworks are built around Backbone

* We know about the structures, but where do they go?
* Whats a good organization practice

# Filesystem

* Static assets are anything not dynamically loaded or worked with
* Isolate assets and application files to assist with builders and your own sanity
* Modules in a separate folder

# Namespacing

* Debugging alone is reason enough to avoid globals
  + Attaching all relevant properties to a singular object is very useful
* Encapsulate your thinking process
* Significantly more portable code

# Understanding a module

* Encapsulates the Backbone structures
* Really good way to think about applications
* Very portable and flexible
* Specific to vague mapping of module => types
  + Meaning do not group all Views together, this is confusing...
  + Think about coming on to a new project and knowing you need to change a view that is happening in a shopping cart.  Cart module.  Then from there you can navigate around the cart module templates or views and find what you're looking for.  Instead of knowing its a view and hunting through a ton of views to find them.
* Showing code of a module
* Make sure modules aren't mutable

# Application logic / deferreds

* Discuss jQuery deferreds / underscore.deferreds
* Control flow, utilize them when necessary
  + Fetching user and tweets *example*

# Using Routers as Controllers/PageViews

*  

# Making routes bookmarkable

* Routes maintain state
* All routes need to be able to run on their own without previous routes being run

# Template handling

* No AJAX
  + Embed in page
  + Compile on server

* With AJAX
  + Separate template files
  + Single template file per module

* Performance and caching implications
  + Downloading all templates without separate requests will be faster in the long run
  + Downloading unused templates can be a waste, and you cannot conditionally cache them

# Structuring Views to render templates

# Possible template engines

* underscore templates
* mustache
* handlebars
* Combyne
* ejs

# Possible script loaders

* RequireJS
* Dojo AMD Loader
* lab.js
* curl.js
* use.js

# Possible build systems to look into

* Hem - Node.js
* Jammit - Ruby
