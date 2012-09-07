$(function() {

  var bsm = {};

  bsm.translate = function() {
    $("[data-bibspotter-i18n]").each(function() {
      var message = chrome.i18n.getMessage($(this).attr("data-bibspotter-i18n"));
      $(this).text(message);
    });
  };

  bsm.gtConfig = function() {
    return {
      'config_ele'   : '#bibspotter-config',
      'multitag'     : false,
      'tags'         : {
         "journal" : [
           { "author"  : { 'background-color' : '#8dd3c7' }},
           { "date"    : { 'background-color' : '#ffa1ff' }},
           { "title"   : { 'background-color' : '#ffffb3' }},
           { "journal" : { 'background-color' : '#79fc72' }},
           { "volume"  : { 'background-color' : '#72f3fc' }},
           { "pages"   : { 'background-color' : '#7284fc', 'color' : '#fff' }},
           { "doi"     : { 'background-color' : '#ffabab' }} ],
         "book" : [
           { "author"      : { 'background-color' : '#8dd3c7' }},
           { "date"        : { 'background-color' : '#ffa1ff' }},
           { "title"       : { 'background-color' : '#ffffb3' }},
           { "booktitle"   : { 'background-color' : '#d19a41', 'color' : '#fff' }},
           { "pages"       : { 'background-color' : '#7284fc', 'color' : '#fff' }},
           { "edition"     : { 'background-color' : '#fb8072' }},
           { "editor"      : { 'background-color' : '#948669', 'color' : '#fff' }},
           { "publisher"   : { 'background-color' : '#fdb562' }},
           { "institution" : { 'background-color' : '#000', 'color' : '#fff' }},
           { "location"    : { 'background-color' : '#bfbada' }},
           { "isbn"        : { 'background-color' : '#80b1d3' }},
           { "doi"         : { 'background-color' : '#ffabab' }} ],
         "extra" : [ "note", "container", "retrieved", "tech", "translator", "unknown", "url" ]
      },
      'active_group' : 'journal',
      'beforeActivate'   : function(obj, data) {
        $.each(data.tags, function(key, value) {
          value = null;
          $(key, obj).wrap(function() {
            $('#bibspotter-config').find('[data-grabtag="' + key + '"]').parent().hide();
            return '<span data-grabtag="' + key + '">' + $(this).text() + '</span>';
          }).remove();
        });
      },
      'onTag'        : function(obj, tag, data) {
        $(tag).parent().hide();
        $('#bibspotter-tags').val(data.content);
      },
      'onTagResize'  : function(obj, data) {
        $('#bibspotter-tags').val(data.content);
      },
      'onTagRemove'  : function(obj, data) {
        $('#bibspotter-config').find('[data-grabtag="' + data.tag.type + '"]').parent().show();
        $('#bibspotter-tags').val(data.content);
      }
    };
  };

  bsm.modalConfig = function() {
    return { minHeight:185,
             minWidth: 675,
             overlayCss : {
               backgroundColor : '#333',
             },
             containerCss : {
               backgroundColor : '#fff',
               padding : '0px',
               border : '3px solid #444',
               borderRadius : '8px'
             }
           };
  };

  bsm.buildModal = function(data, citation) {
    return ['<div id="bibspotter-wrapper">',
              '<div id="bibspotter-header" data-bibspotter-i18n="modal_header">Nothing was found. Help teach BibSpotter by tagging the citation.</div> ',
              '<div id="bibspotter-config"></div>',
              '<div id="bibspotter-refine" class="bibspotter-request">' + data + '</div>',
              '<form>',
              '<input type="hidden" id="bibspotter-raw" value="' + citation + '"></input>',
              '<input type="hidden" id="bibspotter-tags" name="bibspotter-tags" value="' + data + '"></input>',
              '<div id="bibspotter-form-buttons" class="grabtag-selectors-buttons">',
              '<a href="#" class="selected" data-bibspotter-i18n="modal_submit">Submit</a>',
              '<a href="#" class="reset" data-bibspotter-i18n="modal_reset">Clear</a>',
              '</div>',
              '</form>',
            '</div>'].join("");
  };

  bsm.addListener = function() {
    var self = this;

    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
      sender = null;
      var modal = "";

      switch(request.method) {
        case 'bs_start_parse':
          break;
        case 'bs_failed_parse':
          $('#bibspotter-refine').grabtag("destroy");
          $('#bibspotter-wrapper').remove();
          if(request.data === false) { request.data = request.citation; }
          modal = self.buildModal(request.data, request.citation);
          $('body').append(modal);
          self.translate();
          $('#bibspotter-refine').grabtag(self.gtConfig());
          $('#bibspotter-wrapper').modal(self.modalConfig());

          $("a.selected", "#bibspotter-form-buttons").click(function(e) {
            e.preventDefault();
            if($('#bibspotter-tags').val() !== "") {
              self.sendTagged($('#bibspotter-tags').val());
            }
          });
          $("a.reset", "#bibspotter-form-buttons").click(function(e) {
            e.preventDefault();
            $("#bibspotter-refine").grabtag("remove_all");
            $("#bibspotter-config").find(".grabtag-selector").parent().show();
            $('#bibspotter-tags').val("");
          });
          sendResponse({ data : "success" });
          break;
        case 'bs_end_parse':
          break;
        default:
          sendResponse({}); // snub them.

      }
    });
  };

  bsm.sendTagged = function(data) {
    var self = this, message, citation;

    $('a', '#bibspotter-form-buttons').remove();
    chrome.extension.sendMessage({ method: "bs_tagged_citation", data : data }, function(response) {
      citation = $('#bibspotter-raw').val();
      if(response.status !== "success") {
        $('#bibspotter-wrapper').children().remove();
        message = '<p class="bibspotter-response" data-bibspotter-i18n="modal_failure">Sorry, something went wrong and BibSpotter did not receive your tagged citation.</p>';
        $('#bibspotter-wrapper').append(message);
        self.translate();
      } else {
        message = '<p class="bibspotter-response bibspotter-status" data-bibspotter-i18n="modal_retry">Retrying...</p>';
        $('#bibspotter-form-buttons').append(message);
        self.translate();
        setTimeout(function() {
          $.modal.close();
          chrome.extension.sendMessage({ method: "bs_repeat_request", data : citation });
        }, 5000);
      }
    });
  };

  bsm.init = function() {
    this.addListener();
  };

  bsm.init();

});