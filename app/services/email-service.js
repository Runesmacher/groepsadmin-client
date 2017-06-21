(function() {
  'use strict';

  angular
    .module('ga.services.email', [])
    .factory('EmailService', EmailService);

  EmailService.$inject = ['$log','$q','RestService'];

  // Deze service wordt gebruikt door de email-controller

  function EmailService($log,$q,RestService) {
    var emailService = {};

    emailService.getSjablonen = function(){
      var deferred = $q.defer();
      RestService.Emailsjabloon.get().$promise.then(function(res){
        deferred.resolve(res);
      });
      return deferred.promise;
    }

    emailService.patchTemplate = function(){
      var deferred = $q.defer();
      RestService.Emailsjabloon.post().$promise.then(function(res){
        deferred.resolve(res);
      });
      return deferred.promise;
    }

    emailService.saveSjabloon = function(sjabloonId, sObj){
      console.log('ES.saveSjabloon sjabloonId:',sjabloonId, ' -- sjabloonObject:  ', sObj);
      var deferred = $q.defer();
      if(sjabloonId){
        RestService.Emailsjabloon.update({id: sjabloonId, bevestig:true}, sObj).$promise.then(
          function(res){
            deferred.resolve(res);
          }
        );
      }
      return deferred.promise;
    }

    emailService.sendMail = function(obj){
      console.log('ES.sendMail(), ', obj);
      var deferred = $q.defer();
      RestService.LedenMail.post({bevestig:true}, obj).$promise.then(
        function(res){
          deferred.resolve(res);
        }
      );
      return deferred.promise;
    }

    emailService.dataURItoBlob = function(dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0){
          byteString = atob(dataURI.split(',')[1]);
        } else {
          byteString = unescape(dataURI.split(',')[1]);
        }

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], {type:mimeString});
    }

    emailService.getMailReportMessage = function(obj){
      var addressesOk = new Array(); // array
      var failMessages = new Array(); // objects

      var successCounter = 0;
      if(obj.gelukt){
        addressesOk = obj.gelukt; // array
        successCounter += addressesOk.length;
      }

      var messagesNok = {};
      var failMessages = obj.mislukt; // objects
      var failedCounter = 0;
      _.each(failMessages, function(val,key){
        failedCounter += val.length;
        messagesNok[key] = [];
        _.each(val,function(v){
          messagesNok[key].push(v);
        });
      });

      var totalSent = addressesOk.length + failedCounter;
      var messageOk = "Jouw e-mail werd succesvol verzonden naar " + successCounter + " van de " + totalSent + " ontvangers";
      var feedbackObj = {};

      feedbackObj.messageOk = messageOk;
      feedbackObj.messagesNok = messagesNok;

      return feedbackObj;

    }

    return emailService;
  };
})();
