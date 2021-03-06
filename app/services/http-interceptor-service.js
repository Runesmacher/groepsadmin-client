(function() {
  'use strict';

  angular
    .module('ga.services.http', ['ga.services.alert'])
    .factory('httpInterceptor', httpInterceptor)

  httpInterceptor.$inject = ['$q', '$window', 'AlertService', 'keycloak'];

  function httpInterceptor($q, $window, AlertService, keycloak) {
    return {
      'request': function(config) {

        // add keycloak header if request goes to groepsadmin API
        if (config.url.lastIndexOf('/groepsadmin/rest-ga/') >= 0) {
            var deferred = $q.defer();
            keycloak.updateToken().success(function() {
              config.headers = config.headers || {};
              config.headers.Authorization = 'Bearer ' + keycloak.token;
              deferred.resolve(config);
            }).error(function(err) {
              deferred.reject('Failed to refresh token', err);
            });
            return deferred.promise;
        }

        return config;
      },
      'response': function(response) {
        return response;
      },
      'responseError': function(rejection) {
        if (!navigator.onLine || rejection.status == 0) {
          // Note: Browsers implement the NavigatorOnLine.onLine property differently.
          // See the docs: https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/onLine
          AlertService.add('danger', "Er kon geen verbinding gemaakt worden met de Groepsadministratie.", 5000);
        }
        else if (rejection.status == 403) {
          if(rejection.data && rejection.data.beschrijving){
            AlertService.add('danger', rejection.data.beschrijving, 5000);
          }else{
            AlertService.add('danger', "Je bent niet ingelogd", 5000);
          }

        }
        else if (rejection.status == 400) {
          if(rejection.data && rejection.data.fouten){
            var strErr = "";
            _.each(rejection.data.fouten, function(val,key){
              strErr += val.beschrijving + ", ";
            })
            AlertService.add('danger', strErr, 5000);
          }

        }
        else if (rejection.data) {

          if(rejection.data.fouten && rejection.data.fouten.length>0){

            // check if there are errors on contacten
            var checkField = "contacten.contacten";
            var filteredCheck = _.filter(rejection.data.fouten, function(o){ if(o.veld){ return o.veld.indexOf(checkField) >= 0 }});

            if(filteredCheck.length > 0){
              return $q.reject(rejection);
            }else{
              AlertService.add('danger', "<b>" + JSON.stringify(rejection.data) + "</b><br/>", 5000 );
            }

          }else{
              AlertService.add('danger', "<b>" + JSON.stringify(rejection.data) + "</b><br/>", 5000 );
          }
        }
        else{
          if(rejection.error && rejection.error_description){
              AlertService.add('danger', rejection.error_description, 5000);
          }else{
              // als de token expired is, refreshen we de huidige pagina
              if(rejection == "Failed to refresh token"){
                $window.location.reload();
              }
              AlertService.add('danger', "Er ging iets fout tijdens de verwerking van de aanvraag.", 5000);
          }
        }
        return $q.reject(rejection);
      }
    };
  }
})();
