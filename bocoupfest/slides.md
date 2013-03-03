
Client-side development for the server-side
===========================================

Server and Client roles.
------------------------

# Derick Bailey - on Backbone.js on the server

"I can't overstate how bad of an idea it is to use backbone in NodeJS. Would
you try to use backbone code in your ruby/rails web server (putting aside the
language differences)? You shouldn't, and you shouldn't try to do this with
Backbone. The front end browser code is a completely different concern than the
back end server code.  suggesting otherwise betrays naive opinions and
inexperience."

"Experimenting with this to see how it might work together is one thing.
Advocating it as a way to solve problems is harmful as it creates more problems
than it solves. Even with Derby, you don't want to run Backbone as the back-end
code base. Use a library and framework that is built for the back-end."

# TL;DR

* Bad idea to use Backbone.js in Node.
* You are naive and inexperienced if you want to unify server and client.
* Causes more problems than it solves.

# Stance

## Ease

I used to agree. **It was a lot of work with little payoff.** However...

What if it was the same amount of work to write an website or application
server-server as it is to write a client-side application?

## Roles

* API.
* Server rendered state.
* Client interactions and continuous rendering.

## Rendering state on the server

__Totally doable__

Server vs Client
----------------

# Server

* Is relatively stateless and provides static content to be consumed.

# Client

* Has a living document to update, its called the document.

