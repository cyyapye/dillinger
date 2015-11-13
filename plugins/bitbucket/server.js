var express = require('express')
  , app = module.exports = express()
  , Bitbucket = require('./bitbucket.js').Bitbucket
  , request = require('request')
  , qs = require('querystring')
  , fs = require('fs')
  , path = require('path')

/* Bitbucket stuff */

var oauth_bitbucket_redirect = function(req, res) {

  // Create GitHub session object and stash for later.
  var uri;
  req.session.bitbucket = {};
  if (Bitbucket.bitbucketConfig.access_token !== undefined) {
    req.session.bitbucket.oauth = Bitbucket.bitbucketConfig.access_token;
    req.session.isBitbucketSynced = true;
    console.log('/')
    Bitbucket.getUsername(req, res,function() {
      res.redirect('/')
    });
  } else {
    req.session.bitbucket.oauth = {
      request_token: null,
      request_token_secret: null,
      access_token_secret: null,
      access_token: null
    }
    uri = Bitbucket.generateAuthUrl()
    res.redirect(uri)
  }
}

var oauth_bitbucket = function(req, res, cb) {
  if (!req.query.code) {
    cb();
  } else {
    req.session.oauth = {}

    var code = req.query.code
      , client_id = Bitbucket.bitbucketConfig.client_id
      , redirect_uri = Bitbucket.bitbucketConfig.redirect_uri
      , client_secret = Bitbucket.bitbucketConfig.client_secret

    request.post({
      url: 'https://bitbucket.org/site/oauth2/access_token', 
      auth: {
        user: client_id,
        pass: client_secret
      },
      form: {
        grant_type: 'authorization_code',
        code: code
      }
    }, function(err, resp, body) {
      // TODO: MAKE THIS MORE GRACEFUL
      if (err) res.send(err.message)
      else {
        // access_token=519e3f859210aa34265a52acb6b88290087f8996&token_type=bearer
        if (!req.session.bitbucket) {
          req.session.bitbucket = {
            oauth: null
          }
        }
        req.session.bitbucket.oauth = (JSON.parse(body)).access_token
        req.session.isBitbucketSynced = true
        console.log('about')
        Bitbucket.getUsername(req, res,function() {
          res.redirect('/')
        })

      }
    })

  } // end else
}

var unlink_bitbucket = function(req, res) {
  // Essentially remove the session for dropbox...
  delete req.session.bitbucket
  req.session.isBitbucketSynced = false
  res.redirect('/')
}

var import_bitbucket_orgs = function(req, res) {

  Bitbucket.fetchOrgs(req, res)

}

var import_bitbucket_repos = function(req, res) {

  Bitbucket.fetchRepos(req, res)

}

var import_bitbucket_branches = function(req, res) {

  Bitbucket.fetchBranches(req, res)

}

var import_tree_files = function(req, res) {

  Bitbucket.fetchTreeFiles(req, res)

}

var import_bitbucket_file = function(req, res) {

  Bitbucket.fetchFile(req, res)

}

var save_bitbucket = function(req, res) {

  Bitbucket.saveToBitbucket(req, res)

}

/* End Bitbucket stuff */

/* Begin Bitbucket */

app.get('/redirect/bitbucket', oauth_bitbucket_redirect);

app.get('/oauth/bitbucket', oauth_bitbucket);

app.get('/unlink/bitbucket', unlink_bitbucket);

// app.get('/account/bitbucket', account_info_bitbucket)

app.post('/import/bitbucket/orgs', import_bitbucket_orgs);

app.post('/import/bitbucket/repos', import_bitbucket_repos);

app.post('/import/bitbucket/branches', import_bitbucket_branches);

app.post('/import/bitbucket/tree_files', import_tree_files);

app.post('/import/bitbucket/file', import_bitbucket_file);

app.post('/save/bitbucket', save_bitbucket);

app.get('/js/bitbucket.js', function(req, res) {
  fs.readFile(path.join(__dirname, 'client.js'), 'utf8', function(err, data) {
    if (err) {
      res.send(500, "Sorry couldn't read file")
    }
    else {
      res.setHeader('content-type', 'text/javascript');
      res.send(200, data)
    }
  })
})

/* End Bitbucket */
