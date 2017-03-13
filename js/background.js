/*global chrome, Object, alert */
chrome.config = (function() {

  "use strict";

  var configObject = false, xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      configObject = JSON.parse(xhr.responseText);
    }
  };
  xhr.open("GET", chrome.runtime.getURL("/config.json"), false);

  try {
    xhr.send();
  } catch(e) {
    console.log("Couldn't load manifest.json");
  }

  return configObject;

})();

var CrossrefSearch = (function() {

  "use strict";

  var _private = {

    citation: "",

    createContexts: function() {
      chrome.contextMenus.create({
        "title"    : chrome.i18n.getMessage("context_search"),
        "contexts" : ["selection"],
        "onclick"  : this.selectionClick.bind(this)
      });
    },

    verifyStructure: function(selection) {
      var valid_pattern = new RegExp('^(?=.*[A-Z]){3,}(?=.*\d){4,}.+$');
      if(selection.length <= chrome.config.min_citation_length) {
        return false;
      }
      if(!selection.match(valid_pattern)) {
        return false;
      }
      return true;
    },

    selectionClick: function(info) {
      if(!this.verifyStructure(info.selectionText)) {
        alert(chrome.i18n.getMessage("invalid"));
        return false;
      }
      this.citation = info.selectionText;
      this.makeRequest();
    },

    makeRequest: function() {
      var self = this, xhr = new XMLHttpRequest(), data = "", dois = "";

      xhr.open("POST", chrome.config.crossref_api);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) { 
          data = JSON.parse(xhr.responseText);
          if (data.hasOwnProperty("results") && data.results.length > 0) {
            dois = Object.keys(data.results).map(function(index) {
              if (data.results[index].hasOwnProperty("doi") && 
                  data.results[index].hasOwnProperty("score") && 
                  data.results[index].score > 4.5) {
                    return data.results[index].doi;
              }
            });
          }
          if (dois.length === 0) {
            alert(chrome.i18n.getMessage("not_found"));
          } else {
            for(var i in dois) {
              chrome.tabs.create({"url": dois[i]});
            }
          }
        }
      };
      try {
        xhr.send(JSON.stringify([ this.citation ]));
      } catch(e) {
        self.citation = "";
        alert(chrome.i18n.getMessage("request_timeout"));
      }
    }

  };
  
  return {
    init: function() {
      _private.createContexts();
    }
  };

}());

CrossrefSearch.init();
