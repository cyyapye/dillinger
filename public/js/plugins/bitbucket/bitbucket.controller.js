
'use strict';

module.exports =
  angular
  .module('plugins.bitbucket', [
    'plugins.bitbucket.service',
    'plugins.bitbucket.modal'
  ])
  .controller('Bitbucket', function($rootScope, $modal, bitbucketService, documentsService, diNotify) {

  var vm = this;

  vm.importFile          = importFile;
  vm.saveTo              = saveTo;
  vm.updateSHAOnDocument = updateSHAOnDocument;

  //////////////////////////////

  function importFile(username) {

    var modalInstance = $modal.open({
      template: require('raw!./bitbucket-modal.directive.html'),
      controller: 'BitbucketModal as modal',
      windowClass: 'modal--dillinger',
      resolve: {
        items: function() {
          bitbucketService.config.user.name = username;
          return bitbucketService.fetchOrgs().then(bitbucketService.registerUserAsOrg);
        }
      }
    });

    return modalInstance.result.then(function() {
      var file = documentsService.createItem({
        isBitbucketFile: true,
        body:         bitbucketService.config.current.file,
        title:        bitbucketService.config.current.fileName,
        bitbucket: {
          originalFileName:    bitbucketService.config.current.fileName,
          originalFileContent: bitbucketService.config.current.file,
          branch:              bitbucketService.config.current.branch,
          owner:               bitbucketService.config.current.owner,
          repo:                bitbucketService.config.current.repo,
          url:                 bitbucketService.config.current.url,
          path:                bitbucketService.config.current.path
        }
      });

      documentsService.addItem(file);
      documentsService.setCurrentDocument(file);

      bitbucketService.save();
      $rootScope.$emit('document.refresh');
      return $rootScope.$emit('autosave');
    });
  }

  function updateSHAOnDocument(result) {
    documentsService.setCurrentDocumentSHA(result.data.content.sha);
    $rootScope.$emit('document.refresh');
    return $rootScope.$emit('autosave');
  }

  function saveTo(username) {
    var file = documentsService.getCurrentDocument();

    // Document must be an imported file from Bitbucket to work.
    if (file.isBitbucketFile) {
      var filePath = file.bitbucket.path.substr(0,file.bitbucket.path.lastIndexOf('/'));
      var postData = {
        body:    file.body,
        path:    filePath ? filePath + '/' + file.title : file.title,
        sha:     file.bitbucket.sha,
        branch:  file.bitbucket.branch,
        repo:    file.bitbucket.repo,
        owner:   file.bitbucket.owner,
        uri:     file.bitbucket.url,
        message: 'Saved ' + file.title + ' with Dillinger.io'
      };

      return bitbucketService.saveToBitbucket(postData).then(vm.updateSHAOnDocument);
    } else {
      return diNotify({
        message: 'Your Document must be an imported file from Bitbucket.'
      });
    }
  }

});
