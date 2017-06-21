(function() {
  'use strict';

  angular
    .module('ga.emailcontroller', ['ga.services.alert', 'ga.services.dialog', 'ui.bootstrap', 'ui.tinymce'])
    .controller('EmailController', EmailController);

  EmailController.$inject = ['$compile', '$log', '$q', '$scope', '$uibModal', 'AlertService', 'DialogService', 'EmailService', 'LedenLijstService', 'RestService'];

  function EmailController ($compile, $log, $q, $scope, $uibModal, AlertService, DialogService, ES, LLS, RestService) {

    // documentation tinyMCE plugin https://www.tinymce.com/docs/integrations/angularjs/
    var leden = new Array();

    $scope.ledenLaden = false;
    $scope.ledenVisible = false;
    $scope.tinymceModel = 'Initial content';

    $scope.configEditor = function(velden){
      $scope.velden = velden;
      // first make all the menu items
      var menuItems = [];
      var item = {};
      $scope.velden.forEach(function(customer, index){
          item = {
              'text': customer
          };
          menuItems.push(item);
      });

      $scope.tinymceOptions = {
        plugins: [
          'advlist autolink lists link image charmap print preview hr anchor pagebreak',
          'searchreplace wordcount visualblocks visualchars code fullscreen',
          'insertdatetime media nonbreaking save table contextmenu',
          'template paste textcolor colorpicker textpattern imagetools codesample'
        ],
        height: 400,
        menubar: false,
        toolbar: 'undo redo | bold italic underline strikethrough | forecolor backcolor | bullist numlist | alignleft aligncenter alignright | table | code | customDrpdwn | media | preview',
        setup: function(editor){
            editor.addButton( 'customDrpdwn', {
                text : 'Veld invoegen',
                type: 'menubutton',
                icon : false,
                menu: menuItems,
                onselect: function (e) {
                  editor.insertContent('[' + e.target.state.data.text + ']');
                }
            });
        }
      };

      var editorContainer = angular.element(document.querySelector('#editorContainer'));
      var html = $compile('<textarea ui-tinymce="tinymceOptions" ng-model="sjabloon.inhoud"></textarea>')($scope);
      editorContainer.children().remove();
      editorContainer.append(html);

    }

    $scope.changeSjabloon = function(sjabloon){
      $scope.sjabloon = sjabloon;
    }

    $scope.verzenden = function(){

      $scope.isSendingMail = true;

      var sjabloonObj = {
          "vanGroep": $scope.selectedgroup.groepsnummer,
          "replyTo": $scope.sjabloon.replyTo,
          "inhoud": $scope.sjabloon.inhoud,
          "onderwerp": $scope.sjabloon.onderwerp,
          "van": $scope.sjabloon.van,
          "bestemming": {
              "lid": $scope.sjabloon.bestemming.lid,
              "contacten": $scope.sjabloon.bestemming.contacten,
              "groepseigenGegevens": []
          }
      }
      var payload = 'Content-Type: multipart/form-data; charset=utf-8; boundary="--AaB03x"\n\n';
      payload += "--AaB03x\n";
      payload += 'Content-Disposition: form-data; name="sjabloon"\nContent-Type: application/json\n\n';
      payload += JSON.stringify(sjabloonObj);

      // for every file selected, create an attachment
      _.each($scope.files, function(val,key){
        payload += "\n\n";
        payload += "--AaB03x\n";
        payload += 'name="attachments"; fileName="'+val.filename+'"\nContent-Transfer-Encoding: base64';
        payload += '\nContent-Type: '+val.filetype+'\n\n';
        payload += val.base64;
      });

      payload+= "\n--AaB03x--";

      ES.sendMail(payload).then(function(res){
        console.log("emailcontroller - YAY---- mail was sent", res);
        var feedback = ES.getMailReportMessage(res);
        $scope.openDialog(feedback);
        $scope.isSendingMail = false;

      }, function(err){
        AlertService.add('danger', "E-mail kon niet worden verstuurd", 5000);
        $scope.isSendingMail = false;
      });
    }

    // bevestiging return functie
    // --------------------------

    $scope.getLeden = function(offset){
      $scope.ledenLaden = true;
      LLS.getLeden(offset).then(function(res){
        _.each(res.leden, function(val,key){
          $scope.leden.push(val);
        });
        if(res.totaal > $scope.leden.length){
          offset += 50;
          $scope.getLeden(offset);
        }else{
          $scope.ledenLaden = false;
        }
      })
    }

    $scope.deleteSjabloon = function(sjObj){
      $scope.isDeleting = true;
      RestService.Emailsjabloon.delete({id: sjObj.id}).$promise.then(
        function(response){
          AlertService.add('success ', "Sjabloon '"+ sjObj.naam + "' succesvol verwijderd", 5000);
          $scope.isDeleting = false;
          init();
        },function(err){
          $scope.isDeleting = false;
        }
      );
    }

    $scope.saveOrOverwriteSjabloon = function(selectedSjabloon){
      $scope.isSavingSjablonen = true;
      console.log('selectedSjabloon', selectedSjabloon);
      var newSjabloon;
      if(selectedSjabloon.id){
        newSjabloon = selectedSjabloon;
      }else{
        newSjabloon = {};
      }

      newSjabloon.replyTo = $scope.sjabloon.replyTo;
      newSjabloon.van = $scope.sjabloon.van;
      newSjabloon.onderwerp = $scope.sjabloon.onderwerp;
      newSjabloon.inhoud = $scope.sjabloon.inhoud;
      newSjabloon.vanGroep = $scope.selectedgroup.groepsnummer;

      if(selectedSjabloon.id){

        var tmpObj = JSON.parse(JSON.stringify(newSjabloon));

        overwriteSjabloon(selectedSjabloon, tmpObj).then(function(response){
          $scope.isSavingSjablonen = false;
          $scope.showSaveOptions = false;
          _.find($scope.sjablonen, function(f) {
            if (f.id == selectedSjabloon.id) {
              // het sjabloon id kan veranderd zijn door de API.
              f.id = response.id;
            }
          });
          $scope.sjabloon = response;
          // tekstveld leegmaken
          $scope.selectedSjabloon ='';
        });

      }else{
        // voor de zekerheid leading en trailing whitespaces trimmen
        selectedSjabloon = selectedSjabloon.trim();
        // eerst checken of de naam niet overeenkomt met bestaande sjabloon
        // TODO: check op lowercased
        var foundElem = _.find($scope.sjablonen, {'naam' : selectedSjabloon});
        if(foundElem !== undefined){
          var sjObj = {};
          sjObj.naam = foundElem.naam;
          sjObj.id = foundElem.id;
          // indien overeenkomt, eigen functie opnieuw aanroepen met sjObj
          $scope.saveOrOverwriteSjabloon(sjObj);
        }else{
          // indien de naam niet bestaat, maak nieuwe sjObj
          delete $scope.sjabloon.id;
          $scope.sjabloon.naam = selectedSjabloon;
          $scope.sjabloon.vanGroep = $scope.selectedgroup.groepsnummer;

          createNewSjabloon($scope.sjabloon).then(function(res){
            $scope.isSavingSjablonen = false;
            $scope.showSaveOptions = false;
            $scope.lastSavedSjabloon = $scope.sjabloon;
            // tekstveld leegmaken
            $scope.selectedSjabloon ='';
            init();
          });
        }
      }
    }

    var makeDummySjabloon = function(){
      var deferred = $q.defer();
      RestService.Lid.get({id:'profiel'}).$promise.then(function(result) {

            // dit sjabloon zal worden gebruikt als er nog geen sjabloon bestaat voor de gebruiker
            var sjabloon = {};
            sjabloon.naam = 'blanco sjabloon';
            sjabloon.replyTo = result.email;
            sjabloon.van = result.vgagegevens.voornaam + ' ' + result.vgagegevens.achternaam;
            sjabloon.onderwerp = "";
            sjabloon.inhoud = "";
            sjabloon.bestemming = {};
            sjabloon.bestemming.lid = true;
            sjabloon.bestemming.contacten = false;
            deferred.resolve(sjabloon);
      });
      return deferred.promise;
    }

    var overwriteSjabloon = function(sjabloon, obj){
      var deferred = $q.defer();
      obj.naam = sjabloon.naam;

      ES.saveSjabloon(sjabloon.id, obj).then(
      function(result){
        AlertService.add('success', "Template '"+ sjabloon.naam + "' werd succesvol opgeslagen", 5000);
        deferred.resolve(result);
      });
      return deferred.promise;

    }

    var createNewSjabloon = function(sjabloon){
      return $q(function(resolve,reject){
        RestService.Emailsjabloon.post(sjabloon).$promise.then(
          function(response){
            resolve(response);
          }
        );
      });
    }

    function init(){
      $scope.isLoadingSjablonen = true;
      $scope.leden = new Array();
      $scope.getLeden(0);
      $scope.isLoadingGroepen = true;

      ES.getSjablonen().then(function(res){
        $scope.isLoadingSjablonen = false;
        if(res.sjablonen){
          $scope.sjablonen = res.sjablonen;
          if(!res.sjablonen.length > 0){
            makeDummySjabloon().then(function(res){
              $scope.sjablonen.push(res);
              $scope.changeSjabloon($scope.sjablonen[0]);
            })

          }
          if($scope.lastSavedSjabloon && $scope.lastSavedSjabloon.id){
            console.log("last saved", _.find($scope.sjablonen, {'id': $scope.lastSavedSjabloon.id }));
            $scope.changeSjabloon(_.find($scope.sjablonen, {'id': $scope.lastSavedSjabloon.id }));

          }else{
            $scope.changeSjabloon($scope.sjablonen[0]);
          }
        }
      },function(err){
        $scope.isLoadingSjablonen = false;
        AlertService.add('danger', "Er konden geen sjablonen worden opgehaald", 5000);
      });

      RestService.Groepen.get().$promise.then(
        function (result) {
          $scope.groepen = result.groepen;
          $scope.selectedgroup = result.groepen[0];
          $scope.isLoadingGroepen = false;
        },
        function (err){
        }
      );

      // velden ophalen die worden gebruikt in de tinyMCE editor
      // pas wanneer de Kolommen-call resolved is, zal de tinyMCE editor worden geïnitieerd
      RestService.Kolommen.get().$promise.then(
        function(result){
          var arrValues = new Array();
          _.each(result.kolommen, function(val,key){
            arrValues.push(val.label);
          })
          $scope.configEditor(arrValues);
        }
      );

    }

    /*** MODAL LOGIC ***/

    $scope.animationsEnabled = true;

    // template van deze dialog staat in index.html (#emailConfirmationModal)
    $scope.openDialog = function (feedbackObj) {

        var modalInstance = $uibModal.open({
          animation: $scope.animationsEnabled,
          templateUrl: 'emailConfirmationModal.html',
          controller: 'ModalInstanceController',
          size: '',
          resolve: {
            feedback: function () {
              return feedbackObj;
            }
          }
        });

        modalInstance.result.then(function (selectedItem) {
          $scope.selected = selectedItem;
        }, function () {
          $log.info('Modal dismissed at: ' + new Date());
        });
      };

    /*******/

    $scope.removeAttachment = function(file) {
      var index = $scope.files.indexOf(file);
      $scope.files.splice(index, 1);
    }

    /*** BASE64 ENCODED ATTACHMENTS ***/
    $scope.onChange = function (e, fileList) {
      alert('this is on-change handler!');
    };

    $scope.onLoad = function (e, reader, file, fileList, fileOjects, fileObj) {
      alert('this is handler for file reader onload event!');
    };

    var uploadedCount = 0;

    $scope.files = [];
    /*** BASE64 ENCODED ATTACHMENTS *****/

    init();

  }

})();
