chrome.config = (function() {
  var configObject = false, xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) { configObject = JSON.parse(xhr.responseText); }
  };
  xhr.open("GET", chrome.extension.getURL('/config.json'), false);

  try {
    xhr.send();
  } catch(e) {
    console.log('Couldn\'t load manifest.json');
  }

  return configObject;
})();

$(function() {

  var bs = { "citation" : "" };

  bs.createContexts = function() {
    var self = this, parent;

    chrome.contextMenus.create({
      "title"    : chrome.i18n.getMessage("context_search"),
      "contexts" : ["selection"],
      "onclick"  : self.selectionClick
    });

  };

  bs.verifyStructure = function(selection) {
    var valid_pattern = new RegExp('^(?=.*[A-Z]){3,}(?=.*\d){4,}.+$');
    if(selection.length < 15) { return false; }
    if(!selection.match(valid_pattern)) {
      return false;
    }
    return true;
  };

  bs.selectionClick = function(info, tab) {
    tab = null;
    var self = bs;

    if(!self.verifyStructure(info.selectionText)) {
      alert(chrome.i18n.getMessage("invalid"));
      return false;
    }

    self.citation = info.selectionText;
    self.makeRequest();
  };

  bs.makeRequest = function() {
    var self = bs, doi = "";

    $.ajax({
      type     : 'POST',
      url      : chrome.config.crossref_api,
      contentType : "application/json; charset=utf-8",
      dataType : 'json',
      data     : JSON.stringify([ self.citation ]),
      timeout  : 10000,
      success  : function(data) {
        if(data.results && data.results.length > 0) {
          $.each(data.results, function() {
            if (this.doi) { chrome.tabs.create({'url': 'http://dx.doi.org/' + this.doi}); }
          });
        }
      },
      error    : function() {
        self.citation = "";
        alert(chrome.i18n.getMessage("request_timeout"));
      }
   });

  };

  bs.init = function() {
    this.createContexts();
  };

  bs.init();

});

