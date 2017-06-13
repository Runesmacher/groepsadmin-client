(function() {
  'use strict';

  angular
    .module('ga.services.rest', ['ngResource'])
    .factory('RestService', RestService);

  RestService.$inject = ['$resource', '$cacheFactory'];

  function RestService($resource, $cacheFactory) {

    var apiHost;
    if (window.location.protocol === "https:") {
        apiHost = window.location.origin;
    } else {
        //apiHost = 'https://groepsadmin-develop.scoutsengidsenvlaanderen.net';
        // Alternatief als de groepsadmin lokaal draait:
        apiHost = 'http://localhost:8080';
    }

    // Alteratief:
    //var apiRoot = apiHost + '/ga';
    var apiRoot = apiHost + '/groepsadmin';

    var base = apiRoot + '/rest-ga/';
    var baseGis = apiRoot + '/rest/gis/';
    var basejson = "data/";

    return {
      Root: $resource(
        base,
        {},
        {
          get: {
            method: 'GET',
            cache: $cacheFactory('rootCache')
          }
        },
        {
          stripTrailingSlashes: false
        }
      ),
      Lid: $resource(
        base + 'lid/:id?bevestig=:bevestiging',
        {id: '@id', bevestiging: '@bevestiging'},
        {
          'update': {
            method: 'PATCH', transformRequest: changesOnly, cache: false
          }
        }
      ),
      LidAdd: $resource(
        base + 'lid/',
        {},
        {'save': {
            method: 'POST'
          },
         'options': {
            method: 'OPTIONS',
            transformResponse: function (data) {
              var result = {};
              result.data = data;
              return result;
            }
          }
        }
      ),
      LidIndividueleSteekkaart: $resource(
        base + 'lid/:id/steekkaart',
        {id: '@id'},
        {get: {method: 'GET'}}
      ),
      Functie: $resource(
        base + 'functie/:functieId',
        {functieId: '@functieId'},
        {get: {method: 'GET', cache: true}}
      ),
      Functies: $resource(
        base + 'functie/',
        {get: {method: 'GET', cache: true}}
      ),
      GeblokkeerdAdres: $resource(
        basejson + 'geblokkeerdadres.json',
        {get: {method: 'GET'}}
      ),
      Geslacht: $resource(
        basejson + 'geslacht.json',
        {get: {method: 'GET'}}
      ),
      Groep: $resource(
        base + 'groep/:id',
        {groepsnummer: '@id'},
        {get: {method: 'GET'}}
      ),
      Groepen: $resource(
        base + 'groep/',
        {get: {method: 'GET'}}
      ),
      Orakel: $resource(
        base + 'groep/:groepsnummer/ledenaantallen',
        {groepsnummer: '@groepsnummer'},
        {get: {method: 'GET', cache: true}}
      ),
      Oudleden: $resource(
        basejson + 'oudleden.json',
        {get: {method: 'GET'}}
      ),
      Leden: $resource(
        base + 'ledenlijst?aantal=:aantal&offset=:offset',
        {aantal: '@aantal', offset: '@offset'},
        {'get': {method: 'GET', cache: false}}
      ),
      LedenPdf: $resource(
        base + 'ledenlijst?offset=:offset',
        {offset: '@offset'},
        {'get': {
          method: 'GET',
          headers: {
              accept: 'application/pdf'
          },
          responseType: 'arraybuffer',
          cache: true,
          transformResponse: function (data) {
              var pdf;
              if (data) {
                  pdf = new Blob([data], {
                      type: 'application/pdf'
                  });
              }
              return {
                  response: pdf
              };
          }
        }}
      ),
      LedenCsv: $resource(
        base + 'ledenlijst?offset=:offset',
        {offset: '@offset'},
        {'get': {
          method: 'GET',
          headers: {
              accept: 'text/csv'
          },
          responseType: 'arraybuffer',
          cache: true,
          transformResponse: function (data) {
              var csv;
              if (data) {
                  csv = new Blob([data], {
                      type: 'text/csv'
                  });
              }
              return {
                  response: csv
              };
          }
        }}
      ),
      LedenSteekkaarten: $resource(
        base + 'ledenlijst/steekkaart',
        {offset: '@offset'},
        {'get': {
          method: 'GET',
          headers: {
              accept: 'application/pdf'
          },
          responseType: 'arraybuffer',
          cache: true,
          transformResponse: function (data) {
              var pdf;
              if (data) {
                  pdf = new Blob([data], {
                      type: 'application/pdf'
                  });
              }
              return {
                  response: pdf
              };
          }
        }}
      ),
      FilterDetails: $resource(
        base + 'ledenlijst/filter/:id',
        {id: '@id'},
        {'get': {method: 'GET', cache: false}}
      ),
      UpdateFilter: $resource(
        base + 'ledenlijst/filter/:id',
        {id: '@id'},
        {
          'update': {
            method: 'PATCH', transformRequest: changesOnly, cache: false
          }
        }
      ),
      createNewFilter: $resource(
        base + 'ledenlijst/filter/',
        {},
        {
          'post': {
            method: 'POST', transformRequest: changesOnly, cache: false
          }
        }
      ),
      Filters: $resource(
        base + 'ledenlijst/filter',
        {},
        {'get': {method: 'GET', cache: false}}
      ),
      Kolommen: $resource(
        base + 'ledenlijst/kolom-type',
        {},
        {'get': {method: 'GET', cache: true}}
      ),
      Gemeente: $resource(
        baseGis + 'gemeente?term=:zoekterm',
        {zoekterm: '@zoekterm'},
        {'get': {method: 'GET', cache: true}}
      ),
      Code: $resource(
        baseGis + 'code?term=:zoekterm&postcode=:postcode',
        {zoekterm: '@zoekterm', postcode: '@postcode'},
        {'query': {method: 'GET', isArray: true, cache: true}}
      ),
      Websites: $resource(
        base + 'website',
        {},
        {'query': {method: 'GET', isArray: true, cache: true}}
      ),
      Zoeken: $resource(
        base + 'zoeken?query=:zoekterm',
        {zoekterm: '@zoekterm'},
        {'query': {method: 'GET', isArray: true, cache: false}}
      )
    }
  }

  function changesOnly(data) {
    if(data.changes) {
      var changes = new Object();
      //changes.id = data.id;  // id verplicht meesturen

      data.changes.forEach(function (val, key, array) {
        changes[val] = data[val];
      });

      return JSON.stringify(changes);
    } else {
      return JSON.stringify(data);
    }
  }
})();
