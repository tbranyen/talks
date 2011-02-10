jQuery Templates Practically Applied
====================================

* Introduction - 5 minutes
    + About me
        - Who I am
        - What I do
        - Motivation for this talk

    + Server side development that needs a bonding to the client, redundant code otherwise
        - Existing problems combined applications and websites
            * Duplication of markup code and implementation
            * Slow
            * SEO, accessibility
    + Support
        - What kind of support is available show chart of what supports pushState, hashchange, query string with pushState

* Overview - 5-10 minutes
    + Terminology
        + General
            * Website
                + Heavy use of server and client, not particularly unified for development, complicates implementation and infrastructure
            * Web application
                + Server side is only used for web service calls otherwise entirely client side app
            * Progressive enhancement
                + A method of enhancing a user interface with future technology that is outdated browser compliant
        + Templates
    + Templates introduction
        - Templates
            * EJS   - Available Server / Client
            * Closure templates - Available Server / Client - sold as "language neutral"
            * jQuery tempaltes - Server / Client
            * mustache - Server / Client
            * jade - Server / https://github.com/visionmedia/jade/issues/issue/144
            * django templates - Server / Client is outdated by several versions
        - Universal term definitions
            * Template
            * Context
                + Very flexible can be any kind of object really, from a 3rd party source (twitter), from server side serialized JSON (meaning the server sends down json in a property and the javascript hijacks it and renders the template)
            + Template inheritance emulated
    - Installing the server side
        * Node Install
            + http://nodejs.org/#download
        * NPM Install
            + curl http://npmjs.org/install.sh | sh
        * Express install
            + npm install express
        * jQuery templates install
            + npm install jqtpl
        * Optional for caching
            + npm install crc
        
    + Forms of application
        - Website templates
            * Building a site
                + Discuss decisions related to the planning and execution process of a modern website
                + Server side technology and hosting limitations
                    - Advanced requirements being server and server side language for server/client interoperability
                + Client client technology limitations
                    - Can't parse advanced templates
                    - Why you should fetch via AJAX instead of outputting <script> chunks
            * Enhancing the site
                + Introduce progressive enhancement and fetching templates asynchronously
                    + Options: pushState, hashchange or nothing
                    + 
                + Methods of requesting templates on the client
                    - Enforces good coding practice of not relying on 3rd party site, force to fetch context from server which can cache
                    - Use of custom X-Fetch header to specify template or context
            * Perforamnce tweaks
                + Apply caching and HTML5 offline storage to further reduce resources
        - Web application implementations
            * Rendering templates
            * Using dynamically crafted templates to build interfaces
        - Beyond templates
            * Range headers
                + Byte header
                + Custom selectors
            * Meta refresh tag no script hack

* Templates introduction - 5 minutes
* Building a site - 10 minutes
* Enhancing the site - 10 minutes
* Performance tweaks - 10 minutes
* Advanced web application implementations - 10-20 minutes
* Beyond templates - who knows
