
'use strict';

module.exports =
  angular
  .module('plugins.bitbucket.modal', [
    'plugins.bitbucket.service'
  ])
  .controller('BitbucketModal', function($modalInstance, bitbucketService) {

  var vm = this;

  vm.title = 'Organizations';
  vm.orgs  = bitbucketService.config.orgs;
  vm.step  = 1;

  vm.fetchRepos     = fetchRepos;
  vm.fetchBranches  = fetchBranches;
  vm.fetchTreeFiles = fetchTreeFiles;
  vm.fetchFile      = fetchFile;
  vm.close          = closeModal;

  //////////////////////////////

  function setFile() {
    return $modalInstance.close();
  }

  function closeModal() {
    return $modalInstance.dismiss('cancel');
  }

  function setRepos() {
    vm.title = 'Repositories';
    vm.step  = 2;
    vm.repos = bitbucketService.config.repos;

    return vm.repos;
  }

  function fetchRepos(name) {
    bitbucketService.fetchRepos(name).then(setRepos);

    return false;
  }

  function fetchFile(path) {
    bitbucketService.config.current.fileName = path.split('/').pop();
    bitbucketService.config.current.path = path;
    bitbucketService.fetchFile(path).then(setFile);

    return false;
  }

  // Remove
  function setBranches() {
    vm.title = 'Branches';
    vm.step = 3;
    vm.branches = bitbucketService.config.branches;

    return vm.branches;
  }

  // Remove
  function fetchBranches(name) {
    bitbucketService.config.current.repo = name;
    bitbucketService.fetchBranches(name).then(setBranches);

    return false;
  }

  function setTreeFiles() {
    vm.title = 'Files';
    vm.step  = 3;
    vm.files = bitbucketService.config.current.tree;

    return vm.files;
  }

  function fetchTreeFiles(name, slug) {
    bitbucketService.config.current.repo = name;
    bitbucketService.config.current.repoSlug = slug;
    bitbucketService.fetchTreeFiles(slug).then(setTreeFiles);

    return false;
  }

});
