/**
 * jQuery GrabTag
 *
 * A tool to highlight and tag parts of text
 * 
 * Version 0.6
 * January 22, 2012
 *
 * Copyright (c) 2012 David P. Shorthouse
 * Licensed under the MIT license.
 * http://creativecommons.org/licenses/MIT/
 **/
/*global $, jQuery, window, document, alert, Range */

(function($, gt, gtr){

  "use strict";

  var GT              = {},
      eventName       = "mouseup." + gt,
      eventNameResize = "mouseup." + gtr,
      sample_styles   =  [
        { 'background-color' : '#8dd3c7' },
        { 'background-color' : '#ffa1ff' },
        { 'background-color' : '#ffffb3' },
        { 'background-color' : '#79fc72' },
        { 'background-color' : '#72f3fc' },
        { 'background-color' : '#7284fc', 'color' : '#fff' },
        { 'background-color' : '#ffabab' },
        { 'background-color' : '#d19a41', 'color' : '#fff' },
        { 'background-color' : '#fb8072' },
        { 'background-color' : '#948669', 'color' : '#fff' },
        { 'background-color' : '#fdb562' },
        { 'background-color' : '#000', 'color' : '#fff' },
        { 'background-color' : '#bfbada' },
        { 'background-color' : '#80b1d3' },
        { 'background-color' : '#c8c8c8' }
      ];

  GT.get_style = function(obj) {
    return JSON.stringify(obj).replace(/[{}"]/g, "").replace(",", ";");
  };

  GT.convert_markup = function(obj) {
    var snippet = "",
        result  = $(obj).clone(),
        tag     = "";

    snippet = $('[data-' + gt + ']', result);
    snippet.each(function() {
      tag = $(this).attr("data-" + gt);
      $(this).prev("." + gt + "-resizer").remove().end()
             .next("." + gt + "-resizer").remove().end()
             .before('<' + tag + '>' + $(this).text() + '</' + tag + '>').remove();
    });
    result[0].normalize();
    return result.html();
  };

  GT.clear_selections = function() {
    var sel;

    if(document.selection && document.selection.empty){
      document.selection.empty() ;
    } else if(window.getSelection) {
      sel = window.getSelection();
    } else if(document.getSelection) {
      sel = document.getSelection();
    }
    if(sel && sel.removeAllRanges) { sel.removeAllRanges(); }
  };

  GT.build_resizer = function(type) {
    return '<span class="' + gt + '-resizer ' + gt + '-resizer-' + type + '"></span>';
  };

  GT.get_selections = function() {
    var sel;

    if(window.getSelection) {
      sel = window.getSelection();
    } else if (document.getSelection) {
      sel = document.getSelection();
    } else if(document.selection) {
      sel = document.selection.createRange();
    }
    return sel;
  };

  GT.get_range = function(selection) {
    var range = "";

    if(typeof selection.getRangeAt !== "undefined") {
      range = selection.getRangeAt(0);
    } else {
      range = document.selection.createRange();
    }
    return range;
  };

  GT.build_selector = function(title, innerContent, style, selector) {
    var classes = gt + '-selector ' + gt + '-tag',
        output  = "";

    innerContent = innerContent || "";
    if(!selector) { classes += ' ' + gt + '-item'; }
    output = '<span class="' + classes + '" style="' + style + '" title="' + title + '" data-' + gt + '="' + title + '">' + innerContent + '</span>';
    if(selector) { output = '<li>' + output + '</li>'; }
    return output;
  };

  GT.range_intersects = function(range, node) {
    var nodeRange = document.createRange();

    try {
      nodeRange.selectNode(node);
    } catch(error) {
      nodeRange.selectNodeContents(node);
    }

  return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) === -1 &&
         range.compareBoundaryPoints(Range.START_TO_END, nodeRange) === 1;
  };

  GT.range_intersects_tags = function(range, obj) {
    var self       = this,
        intersects = false;

    $('.' + gt + '-tag', $(obj)).each(function() {
      if(self.range_intersects(range, this)) {
        intersects = true;
        return;
      }
    });
    return intersects;
  };

  GT.range_intersects_tag = function(range, obj, tag) {
    var self       = this,
        intersects = false;

    $('.' + gt + '-tag', $(obj)).not($(tag)).each(function() {
      if(self.range_intersects(range, this)) {
        intersects = true;
        return;
      }
    });
    return intersects;
  };

  GT.get_offset = function(element) {
    var start             = 0,
        end               = 0,
        caretOffset       = { "start" : start, "end" : end },
        range             = "",
        preCaretRange     = "",
        textRange         = "",
        preCaretTextRange = "";

    if (typeof window.getSelection !== "undefined") {
        range = window.getSelection().getRangeAt(0);
        preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        end           = preCaretRange.toString().length;
        start         = end - range.toString().length;
        caretOffset   = { "start" : start , "end" : end };
    } else if (typeof document.selection !== "undefined" && document.selection.type !== "Control") {
        textRange         = document.selection.createRange();
        preCaretTextRange = document.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        end           = preCaretTextRange.text.length;
        start         = end - textRange.text.length;
        caretOffset   = { "start" : start, "end" : end };

    }
    return caretOffset;
  };


  GT.add_resizers = function(obj, settings, newNode) {
    var self      = this,
        resizer_w = self.build_resizer('w'),
        resizer_e = self.build_resizer('e');

    if($(newNode, obj).children('.' + gt + '-resizer').length === 0) {
      $(newNode, obj).prepend(resizer_w).append(resizer_e);
    }

    $('.' + gt + '-resizer', $(newNode)).mousedown(function() {
      var _self      = $(this),
          tag        = obj[0].children[$(this).parent().index()],
          tag_type   = $(tag).attr("data-" + gt);

      self.clear_selections();
      $(obj)[gt]("destroy");

      $(obj).unbind(eventNameResize).bind(eventNameResize, function() {
        var selection          = self.get_selections(),
            range              = self.get_range(selection),
            preCaretRange      = range.cloneRange(),
            intersects         = self.range_intersects(range, tag.childNodes[1]),
            new_range          = document.createRange(),
            preCaretRange_size = range.toString().length,
            offset             = self.get_offset($(obj)[0]),
            contents           = "";

        if(self.range_intersects_tag(range, $(obj), $(tag))) {
          self.clear_selections();
          $(this).unbind(eventNameResize).bind(eventName, { 'settings' : settings }, self.tag_selected);
          settings.onOverlapWarning.call();
          return;
        }

        try {
          if(_self.hasClass(gt + "-resizer-e")) {
            if(intersects) {
              new_range.setStart(tag.childNodes[1], 0);
              new_range.setEnd(tag.childNodes[1], tag.childNodes[1].length-preCaretRange_size);
            } else {
              
              new_range.setStart(tag.childNodes[1], 0);
              new_range.setEnd(range.endContainer, range.endOffset);
            }
          } else if(_self.hasClass(gt + "-resizer-w")) {
            if(intersects) {
              new_range.setStart(tag.childNodes[1], preCaretRange_size);
              new_range.setEnd(tag, 2);
            } else {
              new_range.setStart(range.startContainer, range.startOffset);
              new_range.setEnd(tag, 2);
            }
          }
          self.clear_selections();
          contents = new_range.cloneContents().textContent;
          if(contents.length === 0) {
            self.clear_selections();
          } else {
            contents = new_range.extractContents().textContent;
            newNode = $(self.build_selector(tag_type, contents, $(tag).attr("style")));
            if(_self.hasClass(gt + "-resizer-e")) {
              if(intersects) {
                $(tag).after(preCaretRange.toString());
                offset.start = offset.start - contents.length;
                offset.end = contents.length + offset.start;
              } else {
                offset.start = offset.end - contents.length;
                offset.end = offset.start + contents.length;
              }
            }
            if(_self.hasClass(gt + "-resizer-w")) {
              if(intersects) {
                $(tag).before(preCaretRange.toString());
                offset.start = offset.end;
                offset.end = offset.end + contents.length;
              } else {
                offset.end = offset.start + contents.length;
              }
            }
            $(tag).before(newNode).remove();
            self.add_resizers($(this), settings, newNode);
            self.add_context_menu($(this), settings, newNode);
            self.add_hover(newNode);
            obj[0].normalize();
            settings.onTagResize.call(this, $(this), { "tag" : { "type" : tag_type, "value" : contents, "offset" : offset }, "content" : self.convert_markup(this) });
          }
        } catch(error) {
          self.clear_selections();
          $(this).unbind(eventNameResize).bind(eventName, { 'settings' : settings }, self.tag_selected);
          settings.onOverlapWarning.call();
        }

        self.clear_selections();
        $(this).unbind(eventNameResize).bind(eventName, { 'settings' : settings }, self.tag_selected);
      });

    });
  };

  GT.add_context_menu = function(obj, settings, tag) {
    var self      = this;

    $(tag).on("mouseover", function() {
      var tag_type  = $(this).attr("data-" + gt),
          tag_value = $(this).text(),
          menu = [{
            'Remove':{
              onclick:function(menuItem,menu) {
                var s       = "",
                    range   = "",
                    offset  = {},
                    content = "";
                
                menuItem = null; menu = null;
                if(window.getSelection) {
                  s = window.getSelection();
                  range = document.createRange()
                  range.selectNode(tag[0]);
                  s.addRange(range);
                } else {
                  range = document.selection.createRange();
                  range.moveToElementText(tag[0]);
                  range.select();
                }
                offset = self.get_offset($(obj)[0]);
                content = $(this).find('.' + gt + '-resizer').remove().end().html();
                $(this).before(content).unbind("contextmenu").remove();
                $(obj)[0].normalize();
                settings.onTagRemove.call(this, $(obj), { "tag" : { "type" : tag_type, "value" : tag_value, "offset" : offset }, "content" : self.convert_markup($(obj)) });
              }
            }
          }];

      $(this).unbind("contextmenu").contextMenu(menu, {'beforeShow' : function() { self.clear_selections(); }, 'shadow' : false});
    });
  };

  GT.add_hover = function(tag) {
    $(tag).hover(function() {
      $("." + gt + "-resizer", $(this)).each(function(){
        $(this).addClass(gt + "-hover");
      });
    }, function() {
      $("." + gt + "-resizer", $(this)).each(function() {
        $(this).removeClass(gt + "-hover");
      });
    }
   );
  };

  GT.preloader = function(obj, selectors, settings) {
    var self    = this,
        tags    = {},
        snippet = "",
        i       = 0;

    $.each(selectors, function(index0, value0) {
      if($.isArray(value0)) {
        $.each(value0, function(index1, value1) {
          index1 = null;
          $.each(value1, function(index2, value2) {
            tags[index2] = value2;
          });
        });
      } else {
        tags[index0] = value0;
      }
    });

    settings.beforeActivate.call(this, obj, { "tags" : tags });

    $('*', obj).each(function() {
      if($(this).attr('data-' + gt) === undefined || !$.inArray($(this).attr('data-' + gt), tags)) {
        $(this).before($(this).text()).remove();
      }
    });

    $(obj)[0].normalize();

    $.each(tags, function(index, value) {
      snippet = $('[data-' + gt + '="' + index + '"]', obj);
      if(snippet.length > 1 && !settings.multitag) {
        $(snippet[0]).addClass(gt + '-selector ' + gt + '-tag ' + gt + '-item').attr('title', index).attr('style', self.get_style(value));
        self.add_resizers($(obj), settings, $(snippet[0]));
        self.add_context_menu($(obj), settings, $(snippet[0]));
        self.add_hover($(snippet[0]));
        for(var i = 1; i < snippet.length; i += 1 ) {
          $(snippet[i]).before($(snippet[i]).text()).remove();
        }
      } else {
        snippet.each(function() {
          $(this).addClass(gt + '-selector ' + gt + '-tag ' + gt + '-item').attr('title', index).attr('style', self.get_style(value));
          self.add_resizers($(obj), settings, $(this));
          self.add_context_menu($(obj), settings, $(this));
          self.add_hover($(this));
        });
      }
    });

    $(obj)[0].normalize();

    settings.onActivate.call(this, obj, { "content" : self.convert_markup(obj) });
  };

  GT.tag_selected = function(e) {
    var self       = GT,
        selection  = self.get_selections(),
        range      = self.get_range(selection),
        sel_text   = (window.getSelection) ? selection.toString() : selection.text,
        newNode    = "",
        settings   = e.data.settings,
        selected   = '.' + gt + '-tag[data-' + gt + '="' + settings.sticky_tag + '"]',
        offset     = self.get_offset($(this)[0]);

    if(!settings.sticky) {
      $(this).data("data-" + gt, { "range" : range, "offset" : offset });
      return;
    }

    if(!settings.multitag && $(selected, $(this)).length === 1) {
      self.clear_selections();
      settings.onMultitagWarning.call(this, $(this), $(selected, $(settings.config_ele)));
      return;
    }

    if($.trim(sel_text) !== "") {
      settings.beforeTag.call(this, $(this), $(selected, $(settings.config_ele)));
      newNode = $(self.build_selector(settings.sticky_tag, sel_text, $(selected, $(settings.config_ele)).attr("style"), false));
      try {
        if(self.range_intersects_tags(range, $(this))) {
          self.clear_selections();
          settings.onOverlapWarning.call();
          return;
        } else {
          self.clear_selections();
          if(window.getSelection) {
            newNode = $(newNode);
            range.surroundContents(newNode[0]);
            self.add_resizers($(this), settings, newNode);
            self.add_context_menu($(this), settings, newNode);
            self.add_hover(newNode);
          } else {
            var wrapper = newNode.wrap("<div></div>").parent();
            wrapper.find("." + gt + "-tag").each(function() {
//              self.add_resizers($(obj), settings, $(this));
//              self.add_context_menu($(obj), settings, $(this));
//              self.add_hover($(this));
            });
            range.pasteHTML(wrapper.html());
          }
          settings.onTag.call(this, $(this), $(selected, $(settings.config_ele)), { "tag" : { "type" : settings.sticky_tag, "value" : sel_text, "offset" : offset }, "content" : self.convert_markup(this) });
        }
      } catch(error) {
        self.clear_selections();
        settings.onOverlapWarning.call();
        return;
      }
    }
  };

  GT.add_selection = function(obj, tag, settings) {
    var self     = this,
        tag_type = tag.attr("data-" + gt),
        data     = $(obj).data("data-" + gt),
        newNode  = $(self.build_selector(tag_type, tag_type, $(tag).attr("style"), false));

    if(data !== undefined) {
      settings.beforeTag.call(self, $(obj), $(tag));
      data.range.surroundContents(newNode[0]);
      self.add_resizers($(obj), settings, newNode);
      self.add_context_menu($(obj), settings, newNode);
      self.add_hover(newNode);
      settings.onTag.call(self, $(obj), $(tag), { "tag" : { "type" : tag_type, "value" : data.range.toString(), "offset" : data.offset }, "content" : self.convert_markup($(obj)) });
    }
    $(obj).data("data-" + gt, "");
  };

//TODO: counts & default color selections get a little wonky when there are groups
  GT.build_initializer = function(obj, settings) {
    var self      = this,
        counter   = 0,
        content   = "",
        button    = "",
        selectors = {},
        selector  = "",
        tag_obj   = {},
        selected  = "",
        stored    = $(obj).data("data-" + gt) || {};

    $.each(settings.tags, function(index0, value0) {
      if(typeof value0 === "object") {
        $.each(value0, function(index1, value1) {
          if(isNaN(index1)) {
            selectors[index1] = value1;
          } else {
            selectors[index0] = selectors[index0] || [];
            if(typeof value1 === "object") {
              $.each(value1, function(index2, value2) {
                tag_obj = {};
                tag_obj[index2] = value2;
                selectors[index0].push(tag_obj);
              });
            } else {
              tag_obj = {};
              tag_obj[value1] = sample_styles[counter] || sample_styles[14];
              selectors[index0].push(tag_obj);
            }
          }
          counter += 1;
        });
      } else {
        selectors[value0] = sample_styles[counter] || sample_styles[14];
        counter += 1;
      }
    });

    $.each(selectors, function(index, value) {
      index = null;
      if($.isArray(value)) {
        content = '<div class="' + gt + '-selectors-buttons"><ul></ul></div>';
        return;
      }
    });

    $(settings.config_ele).append(content);

    if($('.' + gt + '-selectors-buttons', settings.config_ele).length > 0) {
      $.each(selectors, function(index0, value0) {
        $(settings.config_ele).append('<div class="' + gt + '-selectors-type ' + index0 + '"><ul></ul></div>');
        selected = (index0 === settings.active_group) ?  " selected" : "";
        button = '<li><a href="#" class="' + gt + '-selectors-button ' + index0 + selected + '">' + index0 + '</a></li>';
        $('.' + gt + '-selectors-buttons ul').append(button);
        $.each(value0, function() {
          $.each(this, function(index1, value1) {
            selector = self.build_selector(index1, index1, self.get_style(value1), true);
            $('.' + gt + '-selectors-type.' + index0 + ' ul').append(selector);
          });
        });
      });
    } else {
      $(settings.config_ele).append('<div class="' + gt + '-selectors-type"><ul></ul></div>');
      $.each(selectors, function(index, value) {
        selector = self.build_selector(index, index, self.get_style(value), true);
        $('.' + gt + '-selectors-type ul', settings.config_ele).append(selector).parent().show();
      });
    }

    $(settings.config_ele).find('.' + gt + '-selectors-button').each(function() {
      $(this).bind('click', function(e) {
        e.preventDefault();
        $('.' + gt + '-selectors-button', settings.config_ele).removeClass("selected");
        $(this).addClass("selected");
        $('.' + gt + '-selectors-type', settings.config_ele).hide();
        $.each($(this).attr("class").split(/\s+/), function() {
          $('.' + gt + '-selectors-type.' + this, settings.config_ele).show();
        });
      });
      if($(this).hasClass(settings.active_group)) { $(this).trigger('click'); }
    }).end().find('.' + gt + '-selector', '.' + gt + '-selectors-type').each(function() {
        if(settings.sticky && $(this).text() === settings.sticky_tag) { $(this).addClass('selected'); }
        $(this).click(function(e) {
          var _self = $(this);
          e.preventDefault();
          $('.' + gt + '-selectors-type', settings.config_ele).find('.' + gt + '-selector').removeClass("selected");
          if(settings.sticky) {
            _self.addClass("selected");
            settings.config_activate = false;
            settings.sticky_tag = _self.text();
            $(obj)[gt]("destroy")[gt](settings);
          } else {
            if(stored) {
              if(!settings.multitag && $('[data-' + gt + '="' + _self.attr("data-" + gt) + '"]', $(obj)).length === 1) {
                settings.onMultitagWarning.call(this, $(obj), _self);
              } else {
                self.add_selection($(obj), _self, settings);
              }
            }
          }
        });
      });

    return selectors;
  };

  GT.methods = {
    init : function(f, options) {
      f = null;
      return this.each(function() {
        var self = $(this), settings = $.extend({}, $.fn[gt].defaults, options);
        self.bind(eventName, { 'settings' : settings }, GT.tag_selected);
        if(settings.config_activate) { GT.preloader(self, GT.build_initializer(self, settings), settings); }
      });
    },
    remove_all : function() {
      return this.each(function() {
        $('.' + gt + '-tag', $(this)).each(function() {
          $(this).children('.' + gt + '-resizer').remove().end().before($(this).html()).remove();
          $(this)[0].normalize();
        });
      });
    },
    destroy : function() {
      return this.unbind(eventName);
    }
  };

  $.fn[gt] = function(method) {
    if (GT.methods[method]) {
      return GT.methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === "function" || !method) {
      return GT.methods.init.apply(this, arguments);
    } else if (typeof method === "object") {
      return GT.methods.init.apply(this, [null, method]);
    } else {
      $.error('Method ' +  method + ' does not exist on jQuery ' + gt);
    }
  };

  $.fn[gt].defaults = {
    'config_ele'        : '#' + gt + '-initializer',
    'config_activate'   : true,
    'multitag'          : true,
    'tags'              : {},
    'active_group'      : '',
    'sticky'            : false,
    'sticky_tag'        : '',

    'beforeActivate'    : function(obj, data) { obj = null; data = null; },
    'onActivate'        : function(obj, data) { obj = null; data = null; },
    'beforeTag'         : function(obj, tag) { obj = null; tag = null; },
    'onTag'             : function(obj, tag, data) { obj = null; tag = null; data = null; },
    'onTagResize'       : function(obj, data) { obj = null; data = null; },
    'onTagRemove'       : function(obj, data) { obj = null; data = null; },
    'onMultitagWarning' : function(obj, tag) { obj = null; tag = null; alert('This tag has already been used'); },
    'onOverlapWarning'  : function() { alert('This selection overlaps a previous selection'); }
  };

}(jQuery, 'grabtag', 'grabtag-resize'));