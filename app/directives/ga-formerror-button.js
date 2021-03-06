(function() {
  'use strict';

  angular
    .module('ga.formerrorbutton', [])
    .directive('formerrorbutton', formerrorbutton);

  function formerrorbutton() {
    return {
      restrict: 'E',
      templateUrl: 'partials/formerrorbutton.html',
      replace: false,
      scope: {
        formulier: '=',
        watchable: '='
      },
      controller: ErrorButtonController
    };
  }

  function ErrorButtonController($scope, $attrs) {

    $scope.$watch('formulier.$error', function() {
        $scope.numberOfErrors = getNumberOfErrors();
    }, true);

    $scope.setFocusFirstInvalid = function(){
      var firstInvalid = angular.element('.ng-invalid');
      firstInvalid.focus();
    }

    var getNumberOfErrors = function(){
      var numberOfErrors = 0;
      _.each($scope.formulier.$error,function(val,key){
        numberOfErrors += val.length;
      })
      return numberOfErrors;
    }
  }

})();
