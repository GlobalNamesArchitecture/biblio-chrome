/*global jQuery, window, document, self, chrome, console, _gaq */
chrome.config = (function() {

  "use strict";

  var configObject = false, xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) { configObject = JSON.parse(xhr.responseText); }
  };
  xhr.open("GET", chrome.extension.getURL("/config.json"), false);

  try {
    xhr.send();
  } catch(e) {
    console.log("Couldn't load manifest.json");
  }

  return configObject;
})();

var BiblioChrome = (function($, window, document) {

  "use strict";

  var _private = {

    citation: "",

    trackEvent: function(category, action) {
      if (window._gaq !== undefined) { _gaq.push(["_trackEvent", category, action]); }
    },

    createContexts: function() {
      chrome.contextMenus.create({
        "title"    : chrome.i18n.getMessage("context_search"),
        "contexts" : ["selection"],
        "onclick"  : this.selectionClick.bind(this)
      });
    },

    verifyStructure: function(selection) {
      var valid_pattern = new RegExp('^(?=.*[A-Z]){3,}(?=.*\d){4,}.+$');
      if(selection.length <= chrome.config.min_citation_length) { return false; }
      if(!selection.match(valid_pattern)) {
        return false;
      }
      return true;
    },

    selectionClick: function(info) {
      this.trackEvent("search", "launch");
      if(!this.verifyStructure(info.selectionText)) {
        alert(chrome.i18n.getMessage("invalid"));
        return false;
      }
      this.citation = info.selectionText;
      this.makeRequest();
    },

    makeRequest: function() {
      var self = this, doi = "";

      $.ajax({
        type     : "POST",
        url      : chrome.config.crossref_api,
        contentType : "application/json; charset=utf-8",
        dataType : "json",
        data     : JSON.stringify([ this.citation ]),
        timeout  : 10000,
        success  : function(data) {
          if(data.hasOwnProperty("results") && data.results.length > 0) {
            self.sendWebHook(data);
            $.each(data.results, function() {
              if (this.hasOwnProperty("doi") && this.hasOwnProperty("score") && this.score > 4.5) {
                chrome.tabs.create({"url": this.doi});
                self.trackEvent("search", "found");
              } else {
                alert(chrome.i18n.getMessage("not_found"));
                self.trackEvent("search", "not found");
              }
            });
          } else {
            alert(chrome.i18n.getMessage("not_found"));
          }
        },
        error    : function() {
          self.citation = "";
          alert(chrome.i18n.getMessage("request_timeout"));
          self.trackEvent("search", "timeout");
        }
      });
    },

    sendWebHook: function(message) {
      chrome.tabs.query({active : true, currentWindow : true}, function(tab) {
        tab = tab[0];
        alert(tab.id);
      });
    },

    init: function() {
      this.createContexts();
    }

  };

  _private.init();

}(jQuery, window, document));
