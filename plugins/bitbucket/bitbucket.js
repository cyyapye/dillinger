var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , url = require('url')

var bitbucketConfigFile = path.resolve(__dirname, 'bitbucket-config.json')
  , bitbucketConfig = {}
  , isConfigEnabled = false

// ^^^helps with the home page view; should we show the bitbucket dropdown?

if (fs.existsSync(bitbucketConfigFile)) {
  bitbucketConfig = require(bitbucketConfigFile);
  isConfigEnabled = true;
} else if (process.env.bitbucket_client_id !== undefined) {
  bitbucketConfig = {
    "client_id": process.env.bitbucket_client_id,
    "redirect_uri": process.env.bitbucket_redirect_uri,
    "client_secret": process.env.bitbucket_client_secret,
    "callback_url": process.env.bitbucket_callback_url
  };
  isConfigEnabled = true;
  console.log('Bitbucket config found in environment. Plugin enabled. (Key: "' + bitbucketConfig.client_id +'")');
} else if (process.env.bitbucket_access_token !== undefined) {
  bitbucketConfig = {
    "access_token": process.env.bitbucket_access_token
  };
  isConfigEnabled = true;
  console.log('Bitbucket config found in environment. Plugin enabled using a personal access_token.');
} else {
  bitbucketConfig = {
    "client_id": "YOUR_ID"
  , "redirect_uri": "http://dillinger.io/"
  , "client_secret": "YOUR_SECRET"
  , "callback_url": "http://dillinger.io/oauth/bitbucket"
  , "repos_per_page": "50"
  }
  console.warn('Bitbucket config not found at ' + bitbucketConfigFile + '. Plugin disabled.')
}

function arrayToRegExp(arr) {
  return new RegExp("(" + arr.map(function(e) { return e.replace('.','\\.'); }).join('|') + ")$", 'i');
}

exports.Bitbucket = (function() {

  var bitbucketApi = 'https://api.bitbucket.org/'
    , headers = {
      "User-Agent": "X-Dillinger-App"
    }

  // String builder for auth url...
  function _buildAuthUrl() {
    return  'https://bitbucket.org/site/oauth2/authorize?client_id='
            + bitbucketConfig.client_id
            + '&response_type=code'
  }

  function _getHeaderWithToken(req) {
    headers['Authorization'] = 'Bearer ' + req.session.bitbucket.oauth
    return headers;
  }

  return {
    isConfigured: isConfigEnabled,
    bitbucketConfig: bitbucketConfig,
    generateAuthUrl: function(req, res) {
      return _buildAuthUrl()
    },
    getUsername: function(req, res, cb) {

      var uri = bitbucketApi + '2.0/user'

      var options = {
        headers: _getHeaderWithToken(req)
      , uri: uri
      }

      console.log('getting username from bitbucket')

      request(options, function(e, r, d) {
        if (e) {
          console.error(e)
          return res.redirect(r.statusCode)
        }
        else if (!e && r.statusCode === 200) {
          d = JSON.parse(d)
          req.session.bitbucket.username = d.username
          cb && cb()
        }
      }) // end request.get()

    }, // end getUsername
    fetchOrgs: function(req, res) {
      var uri = bitbucketApi + '2.0/teams?role=contributor'

      var options = {
        headers: _getHeaderWithToken(req)
      , uri: uri
      }

      request(options, function(e, r, d) {
        if (e) {
          res.send({
            error: 'Request error.',
            data: r.statusCode
          })
        }
        else if (!e && r.statusCode == 200) {
          var set = []

          d = JSON.parse(d)

          d.values.forEach(function(el) {

            var item = {
              url: el.links.self
            , name: el.display_name
            }

            set.push(item)
          })

          res.json(set)

        } // end else if
        else {
          res.json({ error: 'Unable to fetch organizations from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchOrgs

    fetchRepos: function(req, res) {

      var uri;

      var entity = req.session.bitbucket.username;
      if (req.body.owner !== req.session.bitbucket.username) {
        entity = req.body.owner;
      }

      uri = bitbucketApi + '2.0/repositories/' + entity

      if (isFinite(req.body.page) && +req.body.page > 1) {
        uri += "&page=" + req.body.page
      }

      var options = {
        headers: headers
      , uri: uri
      }

      request(options, function(e, r, d) {
        if (e) {
          res.send({
            error: 'Request error.',
            data: r.statusCode
          })
        }
        else if (!e && r.statusCode == 200) {
          var set = []

          d = JSON.parse(d)

          d.values.forEach(function(el) {

            var item = {
              url: el.links.self
            , name: el.name
            , slug: el.full_name
            , private: el.is_private
            // future property we will need to pass so we can know whether we can "write" to repo
            //, permissions: el.permissions
            }

            set.push(item)
          })

          res.json(set)

        } // end else if
        else {
          res.json({ error: 'Unable to fetch repos from Bitbucket.' })
        }
      }) // end request callback
    }, // end fetchRepos

    // Remove
    fetchBranches: function(req, res) {

      var uri = bitbucketApi
        + 'repos/'
        + req.body.owner
        + '/'
        + req.body.repo
        +'/branches?access_token=' + req.session.bitbucket.oauth

      var options = {
        headers: headers
      , uri: uri
      }

      request(options, function(e, r, d) {
        if (e) {
          res.send({
            error: 'Request error.'
          , d: r.statusCode
          })
        }
        else if (!e && r.statusCode === 200) {
          res.send(d)
        } // end else if
        else {
          res.json({ error: 'Unable to fetch branches from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchBranches


    fetchTreeFiles: function(req, res) {
      // /repos/:user/:repo/git/trees/:sha

      var uri, options, fileExts, regExp

      uri = bitbucketApi
        + '1.0/repositories/'
        + req.body.repoSlug
        + '/src/master/content/post/'
        // + req.body.sha + '?recursive=1&access_token=' + req.session.bitbucket.oauth
        ;

      options = {
        headers: _getHeaderWithToken(req)
      , uri: uri
      };

      fileExts = req.body.fileExts.split("|");
      regExp = arrayToRegExp(fileExts);

      request(options, function(e, r, d) {

        if (e) {
          res.send({
            error: 'Request error.'
          , data: r.statusCode
          })
        }
        else if (!e && r.statusCode === 200) {
          d = JSON.parse(d)
          d.branch = req.body.branch // inject branch info

          // overwrite d.tree to only return items that match regexp
          d.tree = d.files.filter(function(item) { return regExp.test(item.path) });

          res.json(d)
        } // end else if
        else {
          res.json({ error: 'Unable to fetch files from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchTreeFiles
    fetchFile: function(req, res) {

      var uri = bitbucketApi
        + '1.0/repositories/'
        + req.body.repoSlug
        + '/src/master/' + req.body.path
        , isPrivateRepo = /blob/.test(uri)

      // https://api.bitbucket.com/octocat/Hello-World/git/blobs/44b4fc6d56897b048c772eb4087f854f46256132
      // If it is a private repo, we need to make an API call, because otherwise it is the raw file.
      // if (isPrivateRepo) {
      //   uri += '?access_token=' + req.session.bitbucket.oauth
      // }

      var options = {
        headers: _getHeaderWithToken(req)
      , uri: uri
      }

      console.log(options)
      request(options, function(e, r, d) {
        if (e) {
          console.error(e)

          res.send({
            error: 'Request error.'
          , data: r.statusCode
          })
        }
        else if (!e && r.statusCode === 200) {
          console.log(d)
          var src = JSON.parse(d);
          console.log(src)

          var jsonResp = {
            file: src,
            error: false
          }

          jsonResp.url = uri;

          // if (isPrivateRepo) {
          //   d = JSON.parse(d)
          //   jsonResp.data.content = (new Buffer(d.content, 'base64').toString('ascii'))
          // }

          res.json(jsonResp)

        } // end else if
        else {
          res.json({ error: 'Unable to fetch file from Bitbucket.' })
        }
      }) // end request callback

    }, // end fetchFile

    saveToBitbucket: function(req, res) {

      var data = req.body
      if (!data.uri) {
        res.json(400, { "error": "Requires Bitbucket URI" })
      }
      else {
        // uri = "https://api.bitbucket.com/repos/:owner/:repo/contents/:path"
        var
          commit, options, uri, owner,
          repo,   branch,  sha, message,
          isPrivateRepo;

        isPrivateRepo = /blob/.test(data.uri);

        branch  = data.branch;
        path    = data.path;
        sha     = data.sha;
        repo    = data.repo;
        owner   = data.owner;
        message = data.message;

        uri = bitbucketApi + "repos/" + owner + '/' + repo + '/contents/' + path;
        uri += '?access_token=' + req.session.bitbucket.oauth;

        commit = {
          message: message // Better commit messages?
        , path: path
        , branch: branch
        , content: data.data
        , sha: sha
      };

        options = {
          headers: headers
        , uri: uri
        , method: "PUT"
        , body: JSON.stringify(commit)
        }

        request(options, function(e, r, d) {
          // 200 = Updated
          // 201 = Created
          if (!e && r.statusCode === 200 || r.statusCode === 201) {
            return res.json(200, JSON.parse(d))
          }
          return res.json(400, { "error": "Unable to save file: " + (e || JSON.parse(d).message) })

        })

      }
    }
  }

})()
