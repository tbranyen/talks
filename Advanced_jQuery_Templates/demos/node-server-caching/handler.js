var fs = require('fs')
  , http = require('http')
  , sys = require('sys')
  , express = require('express')
  , app = express.createServer()
  , jqtpl = require('jqtpl')
  , crc = require('crc');

// Storing pages in an object, theoretically could come from any dataStore.
var pages = {
    '/': { title: 'My Homepage', template: 'templates/index.html' },
    '/twitter/': { title: 'Twitter feed', template: 'templates/twitter.html',
        tweets: {}
    }
};

// Getter helper methods to find the template and context
var get = {
    // Fetch the template by path
    template: function(path, callback) {
        fs.readFile(path, function(err, tpl) {
            if(err) throw 'Cannot find template '+ template;
            callback && callback(tpl.toString());
        });
    },

    // Fetch the context
    context: function(url) {
        var _ = pages[url];
        _.href = url;

        return _;
    },
    json: function(host, path, callback) {
        var client = http.createClient(80, host)
          , req = client.request('GET', path, { host: host })
          , data = '';

        req.end();
        req.on('response', function(res) {
            res.on('data', function(chunk) {
                data += chunk;
            });

            res.on('end', function() {
                callback && callback(JSON.parse(data));
            });
        });
    }
};

// Fetches the template and renders via the context
function render(path, context, callback) {
    get.template(path, function(tpl) {
        // Augment the context to have href
        callback && callback(jqtpl.tmpl(tpl.toString(), context));
    });
}

// Conditional content caching
function cache(req, res, content) {
    // Server does not receive the E-Tag header, its converted to if-none-match...
    var etag = req.headers['if-none-match'],
        // Adequatly identify the content with a CRC
        crc32 = Math.abs(crc.crc32(content));

    // Set the E-Tag header with the latest CRC
    res.headers['ETag'] = crc32;
    // If the latest CRC matches the existing E-Tag we don't need to continue
    if(etag == crc32) {
        return false;
    }

    // Send back the changed content
    return true;
}

// Global page processor
function processPage(req, res, url) {
    try {
        // Page is the path
        var page = !url ? get.context(req.params[0]) : get.context(url)
        // Fetch is the XHR-set property
          , fetch = req.headers['x-fetch'];

        // Deal with 404s responsibly - ie actually send a 404 status in the headers
        // this is just an example
        if(!page) throw 'Page not found';

        // Render page content
        render(page.template, page, function(page_tpl) {
            // Render layout content
            render('templates/layouts/base.html', {
                title: page.title,
                section: page_tpl
            }, function(rendered_tpl) {
                // Here is where we validate the cache
                if(cache(req, res, rendered_tpl)) {
                    res.send(rendered_tpl);
                }
                // Send the 304 status
                else {
                    res.send(304);
                }
            });
        });
    }
    catch(ex) {
        res.send('<h1>404</h1><code>'+ ex +'</code>');
    }
}

// Fetch tweets
function twitter(req, res, page, callback) {
    get.json('api.twitter.com', '/1/statuses/user_timeline.json?screen_name=tbranyen&page='+ page,
        function(obj) {
            var _page = pages['/twitter/'];
            _page.tweets = obj;
            _page.page = +page+1;

            callback && callback();
        }
    );
}

// Fetch templates
app.get('/fetch/template/:page', function(req, res) {
    var page = pages[req.params.page] || pages['/'];
    get.template(page.template, function(tpl) {
        if(cache(req, res, tpl)) {
            res.send(tpl);
        }
        else {
            res.send(304);
        }
    });
});

// Fetch Contexts
app.get('/fetch/context/:page', function(req, res) {
    var page = pages[req.params.page] || pages['/'];
    if(cache(req, res, JSON.stringify(page))) {
        res.send(page);
    }
    else {
        res.send(304);
    }
});

app.get('/twitter', function(req, res) {
    twitter(req, res, 0,
        function() {
            processPage(req, res, '/twitter/');
        }
    );
});

app.get('/twitter/:page', function(req, res) {
    twitter(req, res, req.params.page,
        function() {
            processPage(req, res, '/twitter/');
        }
    );
});

// Use express to catch all
app.get('*', function(req, res) {
    processPage(req, res);
});

app.listen(3000);

sys.print('Running server: http://127.0.0.1:3000');
