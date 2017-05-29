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

    verifyStructure: function() {
      var valid_pattern = new RegExp('^(?=.*[A-Z]){3,}(?=.*\d){4,}.+$');
      if(this.citation.length <= chrome.config.min_citation_length) {
        return false;
      }
      if(!this.citation.match(valid_pattern)) {
        return false;
      }
      return true;
    },

    containedDOI: function() {
      var doi_pattern = new RegExp('(?:(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?![%"#? ])\\S)+))', 'g');
      return this.citation.match(doi_pattern);
    },

    selectionClick: function(info) {
      this.citation = info.selectionText;
      var contained_doi = this.containedDOI();

      if(!this.verifyStructure()) {
        alert(chrome.i18n.getMessage("invalid"));
        return false;
      }
      if(contained_doi && contained_doi.length > 0) {
        for (var i = 0; i < contained_doi.length; i++) {
          chrome.tabs.create({"url": "https://doi.org/" + contained_doi[i]});
        }
        return false;
      }
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
