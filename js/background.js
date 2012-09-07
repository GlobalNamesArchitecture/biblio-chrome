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

  var bs = {
    sources  : ["crossref", "bhl", "biostor"],
    citation : ""
  };

  bs.createContexts = function() {
    var self = this, parent;

    chrome.contextMenus.create({
      "title"    : chrome.i18n.getMessage("context_search"),
      "contexts" : ["selection"],
      "onclick"  : self.selectionClick
    });

  };

  bs.addListener = function() {
    var self = this;

    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.method === "bs_tagged_citation") {
        $.ajax({
          type     : 'POST',
          url      : chrome.config.bibliospotter_url.train,
          async    : false,
          data     : { tagged : request.data },
          success  : function(response) {
            sendResponse(response);
          },
          error    : function() {
            sendResponse(response);
          }
        });
      } else if (request.method === "bs_repeat_request") {
        self.repeatRequest(request.data);
      } else {
        sendResponse({}); // snub them.
      }
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

  bs.trainClick = function(info, tab) {
    tab = null;
    var self = bs;

    self.citation = info.selectionText;
    self.failedRequest(false);
  };

  bs.makeRequest = function() {
    var self = bs, sources = "", identifiers = false, title = false, author = false, date_parts = false, tagged = false, response_url = "";

    $.each(self.sources, function() {
      sources += "&amp;sources[" + this + "]=true";
    });

    self.startParseMessage();

    $.ajax({
      type : 'GET',
      url  : chrome.config.bibliospotter_url.parse + encodeURIComponent(self.citation) + sources,
      timeout : 10000,
      async : false,
      success : function(data) {

        if(data.records[0].status === "success") {
          identifiers = (data.records[0]["identifiers"] !== undefined) ? data.records[0]["identifiers"] : false;
          title       = (data.records[0]["title"] !== undefined) ? data.records[0]["title"] : false;
          author      = (data.records[0]["author"][0]["family"] !== undefined) ? data.records[0]["author"][0]["family"] : false;
          date_parts  = (data.records[0]["issued"]["date-parts"][0] !== undefined) ? data.records[0]["issued"]["date-parts"][0] : false;
        }

        tagged = (data.records[0].tagged !== undefined) ? data.records[0].tagged : false;

        if(title && author && date_parts && date_parts.length > 0) {
          if (identifiers && identifiers.length > 0) {
            $.each(identifiers, function(i,v) {
              i = null;
              if(v.type === "doi") {
                response_url = "http://dx.doi.org/" + v.id;
              } else if (v.type === "bhl") {
                response_url = v.id;
              } else if (v.type === "biostor") {
                response_url = v.id;
              }
              return false;
            });
         } else {
           response_url = "http://scholar.google.com/scholar?q="+encodeURIComponent(title);
         }

         self.endParseMessage();
         chrome.tabs.create({'url': response_url});

       } else {
         self.endParseMessage();
         self.failedRequest(tagged);
       }
     },
     error : function() {
       self.citation = "";
       self.endParseMessage();
       alert(chrome.i18n.getMessage("request_timeout"));
     }
   });

  };

  bs.failedRequest = function(tagged) {
    var self = this;

    chrome.tabs.query({active : true, currentWindow : true}, function(tab) {
      tab = tab[0];
      chrome.tabs.sendMessage(tab.id, { method : "bs_failed_parse", data : tagged, citation : self.citation }, function(response) {
        self.citation = "";
      });
    });
  };

  bs.startParseMessage = function() {
    chrome.tabs.query({active : true, currentWindow : true}, function(tab) {
      tab = tab[0];
      chrome.tabs.sendMessage(tab.id, { method : "bs_start_parse" });
    });
  };

  bs.endParseMessage = function() {
    chrome.tabs.query({active : true, currentWindow : true}, function(tab) {
      tab = tab[0];
      chrome.tabs.sendMessage(tab.id, { method : "bs_end_parse" });
    });
  };

  bs.repeatRequest = function(citation) {
    this.citation = citation;
    this.makeRequest();
  };

  bs.init = function() {
    this.createContexts();
    this.addListener();
  };

  bs.init();

});

