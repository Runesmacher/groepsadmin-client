(function() {
  'use strict';

  angular
    .module('ga.searchcontroller', [])
    .controller('SearchController', SearchController);

  SearchController.$inject = ['$scope', '$location', 'RestService'];

  function SearchController($scope, $location, RestService) {
    $scope.zoekLid = function(zoekterm){
      return RestService.Zoeken.get({zoekterm: zoekterm}).$promise.then(
          function(result){
            if (result.criteria.query == zoekterm){
              return result.leden;
            }
            return null;
        });
    }

    // ga naar het geselecteerde lid
    $scope.gaNaarLid = function(lid) {
      $scope.zoekterm = "";
      $location.path('/lid/' + lid.id);
    };
  }
})();
