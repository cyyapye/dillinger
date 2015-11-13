
'use strict';

module.exports =
  angular
  .module('plugins.bitbucket.service', [])
  .factory('bitbucketService', function($http, diNotify) {

  var defaults = {
    orgs:     {},
    repos:    {},
    branches: {},
    files:    {},
    user: {
      name: '',
      uri:  ''
    },
    current: {
      tree:     [],
      url:      '',
      name:     '',
      sha:      '',
      path:     '',
      branch:   '',
      owner:    '',
      repo:     '',
      file:     '',
      fileName: ''
    }
  },

  service = {

    config: {},

    /**
     *    Add the User to the Organizations Array, as we want to let him
     *    search through his own Repos.
     */
    registerUserAsOrg: function() {
      return service.config.orgs.push({
        name: service.config.user.name
      });
    },

    /**
     *    Fetch the File from Bitbucket.
     *
     *    @param    {String}    url    URL to the File
     */
    fetchFile: function(path) {
      service.config.current.path = path;
      return $http.post('import/bitbucket/file', {
        repoSlug: service.config.current.repoSlug,
        path: path
      }).success(function(result) {
        service.config.current.file = result.file.data;
        service.config.current.url  = result.file.url;
        return false;
      }).error(function(err) {
        return diNotify({
          message: 'An Error occured: ' + err
        });
      });
    },

    /**
     *    Fetches the File Tree of the current Branch.
     *
     *    @param    {String}    sha         SHA of the File
     *    @param    {String}    branch      Selected Branch
     *    @param    {String}    repo        Selected Repo
     *    @param    {String}    owner       Owner of the Repo
     *    @param    {String}    fileExts    File Extensions (.md,.markdown etc.)
     */
    fetchTreeFiles: function(slug, repo, branch, owner, fileExts) {
      var di;
      di = diNotify('Fetching Files...');
      return $http.post('import/bitbucket/tree_files', {
        owner:    owner ? owner : service.config.user.name,
        repoSlug:     slug ? slug : service.config.current.repoSlug,
        repo:     repo ? repo : service.config.current.repo,
        branch:   branch ? branch : service.config.current.branch,
        // sha:      sha ? sha : service.config.current.sha,
        fileExts: fileExts ? fileExts : 'md'
      }).success(function(data) {
        if (di != null) {
          di.$scope.$close();
        }
        service.config.current.owner  = owner ? owner : service.config.user.name;
        service.config.current.repo   = repo ? repo : service.config.current.repo;
        service.config.current.branch = branch ? branch : service.config.current.branch;
        service.config.current.tree   = data.tree;
        return service.config.current;
      }).error(function(err) {
        return diNotify({
          message: 'An Error occured: ' + err
        });
      });
    },

    /**
     *    Fetch the selected Branch.
     *
     *    @param    {String}    repo     Repo Name
     *    @param    {String}    owner    Owner of the Repo
     */
    fetchBranches: function(repo, owner) {
      var di;
      di = diNotify('Fetching Branches...');
      return $http.post('import/bitbucket/branches', {
        owner: owner ? owner : service.config.user.name,
        repo:  repo ? repo : service.config.current.repo
      }).success(function(data) {
        if (di != null) {
          di.$scope.$close();
        }
        service.config.current.owner = owner;
        service.config.current.repo  = repo;
        service.config.branches      = data;

        return service.config.branches;
      }).error(function(err) {
        return diNotify({
          message: 'An Error occured: ' + err
        });
      });
    },

    /**
     *    Fetch Repos of the selected Organization.
     *
     *    @param    {String}    owner    Owner Name
     */
    fetchRepos: function(owner) {
      var di;
      di = diNotify('Fetching Repos...');
      return $http.post('import/bitbucket/repos', {
        owner: owner
      }).success(function(data) {
        if (di != null) {
          di.$scope.$close();
        }
        service.config.current.owner = owner;
        service.config.repos = data;

        return service.config.repos;
      }).error(function(err) {
        return diNotify({
          message: 'An Error occured: ' + err
        });
      });
    },

    /**
     *    Fetch all known Organizations from the User.
     */
    fetchOrgs: function() {
      var di;
      di = diNotify('Fetching Organizations...');
      return $http.post('import/bitbucket/orgs').success(function(data) {
        if (di != null) {
          di.$scope.$close();
        }
        service.config.orgs = data;

        return service.config.orgs;
      }).error(function(err) {
        return diNotify({
          message: 'An Error occured: ' + err
        });
      });
    },

    /**
     *    Update Document on Bitbucket.
     *
     *    @param  {Object}  data  Object for POST Request.
     *
     *    @examples
     *    {
     *    	uri: 'https://api.bitbucket.com/repos/pengwynn/octokit/contents/subdir/README.md',
     *    	data: btoa('DOCUMENT_BODY'),
     *    	path: 'subdir/README.md',
     *    	sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
     *    	branch: 'master',
     *    	repo: 'pengwynn',
     *    	message: 'Commit message.',
     *    	owner: 'octokit'
     *    }
     */
    saveToBitbucket: function(data) {
      var di;
      di = diNotify('Saving Document on Bitbucket...');
      return $http.post('save/bitbucket', {
        uri:     data.uri,
        data:    btoa(data.body),
        path:    data.path,
        sha:     data.sha,
        branch:  data.branch,
        repo:    data.repo,
        message: data.message,
        owner:   data.owner
      }).success(function(result) {
        if (di.$scope != null) {
          di.$scope.$close();
        }
        diNotify({
          message: 'Successfully saved to ' + result.content.path + '!',
          duration: 5000
        });
        return result;
      }).error(function(err) {
        return diNotify({
          message: 'An Error occured: ' + err.error,
          duration: 5000
        });
      });
    },

    save: function() {
      localStorage.setItem('bitbucket', angular.toJson(service.config));
    },

    restore: function() {
      service.config = angular.fromJson(localStorage.getItem('bitbucket')) || defaults;
      return service.config;
    }

  };
  service.restore();
  return service;
});