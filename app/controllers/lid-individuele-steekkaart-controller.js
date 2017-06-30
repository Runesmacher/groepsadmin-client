(function() {
  'use strict';

  angular
    .module('ga.lidindividuelesteekkaartcontroller', ['ga.services.alert', 'ga.services.dialog', 'ui.bootstrap'])
    .controller('LidIndividueleSteekkaartController', LidIndividueleSteekkaartController);

  LidIndividueleSteekkaartController.$inject = ['$scope', '$routeParams', '$window', '$location', 'RestService', 'AlertService', 'DialogService', '$rootScope', 'keycloak' ];

  function LidIndividueleSteekkaartController ($scope, $routeParams, $window, $location, RestService, AlertService, DialogService, $rootScope, keycloak) {
    /*
     * Init
     * --------------------------------------
     */
    // lid ophalen
    RestService.Lid.get({id:$routeParams.id}).$promise.then(
      function(result) {
        $scope.lid = result;
      },
      function(error) {
        if(error.data.beschrijving == "Geen leesrechten op dit lid"){
          //redirect to lid overzicht.
          $location.path('/');
          AlertService.add('danger', "Je hebt geen lees rechten op dit lid.");
        }
        else{
          AlertService.add('danger', "Error" + error.status + ". " + error.statusText);
        }
      }
    );

    // steekkaart ophalen.
    RestService.LidIndividueleSteekkaart.get({id:$routeParams.id}).$promise.then(
      function(result) {
        $scope.individueleSteekkaartWaarden = result.gegevens.waarden;

        //compare functie
        function compare(a,b) {
          if (a.sort < b.sort)
            return -1;
          if (a.sort > b.sort)
            return 1;
          return 0;
        }
        var individueleSteekkaartLayout = result.gegevens.schema.velden.sort(compare);

        // bevat de groepering van de layout van input velden.
        // de teruggave van de API beschrijft enkel waar een groepstart en niet waar een groep stopt.
        $scope.individueleSteekkaartLayoutGroups = [];
        var tempGroup = [];
        angular.forEach(individueleSteekkaartLayout, function(value, index){
          if (value.type == "groep") {
            if (tempGroup.length == 0 ) {
              tempGroup.push(value);
            }
            else {
              $scope.individueleSteekkaartLayoutGroups.push(tempGroup);
              tempGroup = [];
              tempGroup.push(value);
            }
          }
          else {
            tempGroup.push(value);
            if (index == individueleSteekkaartLayout.length -1){
              $scope.individueleSteekkaartLayoutGroups.push(tempGroup);
            }
          }
        })
      },
      function(error) {
        console.log(error);
        if(error.data.beschrijving =="Geen leesrechten op dit lid"){
          //redirect to lid overzicht.
          $location.path('/');
          AlertService.add('danger', "Je hebt geen lees rechten op dit lid.");
        }
        else{
          AlertService.add('danger', "Error" + error.status + ". " + error.statusText);
        }
      }
    );

    $scope.opslaan = function() {

      var request = {
        gegevens: {
          waarden: $scope.individueleSteekkaartWaarden
        }
      };

      $scope.saving = true;
      RestService.LidIndividueleSteekkaart.patch({id: $routeParams.id}, request).$promise.then(
        function(response) {
          $scope.saving = false;
          AlertService.add('success ', "Aanpassingen opgeslagen", 5000);
          $scope.individueleSteekaart.$setPristine();
        }
      );
    }

    /*
    * Pagina event listeners
    * ---------------------------------------
    */

    // listener voor wanneer een gebruiker van pagina veranderd en er zijn nog openstaande aanpassingen.
    $scope.$on('$locationChangeStart', function (event, newUrl, oldUrl) {
      if ($scope.individueleSteekaart.$dirty) {
        event.preventDefault();
        var paramObj = {
              trueVal: newUrl
        }
        DialogService.new("Pagina verlaten", "Er zijn nog niet opgeslagen wijzigingen. Ben je zeker dat je wil verdergaan?", $scope.locationChange, paramObj );
      }
    });

    // return functie voor de bevestiging na het veranderen van pagina
    $scope.locationChange = function(result, url){
      if (result) {
        $window.onbeforeunload = null;
        $window.location.href = url;
      }
    }

    // refresh of navigatie naar een andere pagina.
    $window.onbeforeunload = function(e) {
      if ($scope.individueleSteekaart.$dirty) {
        var waarschuwing = "Er zijn nog niet opgeslagen wijzigingen. Ben je zeker dat je wil verdergaan?";
        e.returnValue = waarschuwing; // werkt niet in alle browsers
        return e.returnValue; // werkt niet in andere browsers
      }
    };
  }
})();
