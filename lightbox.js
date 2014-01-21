//
// lighbox UI module
// 
// Author: Antoine BERNIER (abernier)
//

loadImage = function (url) {
  var dfd = $.Deferred();

  var xhr = new XMLHttpRequest();  
  xhr.onprogress = function (e) {
    dfd.notify(e);
  };
  xhr.onload = function () {
    dfd.resolve(url);
  };
  xhr.onerror = dfd.reject;

  xhr.open("GET", url, true);
  xhr.send();

  var ret = dfd.promise();
  ret.dfd = dfd; // expose a reference to the deferred in order to be able to reject it
  ret.xhr = xhr;

  return ret;
};

// Helper to help we cache dimensions like: width, height, left/top offset
function dims(el) {
  var $el = $(el);
  var offset = $el.offset();

  return {
    w: $el.width(),
    h: $el.height(),
    l: offset.left,
    t: offset.top
  };
}

function Lightbox(link, options) {
  options = $.extend({}, {
    $links: null, // defaults: parent().find('a')
    transitionduration: 300,
    progressbar: true
  }, options);
  this.options = options;

  //
  // $link and $links
  //

  this.$link = $(link);
  // set $links
  if (!this.options.$links) {
    this.$links = this.$link.parent().find('a[href]').has('img[src]');
  } else {
    this.$links = $(this.options.$links);
  }
  // check $link is within $links
  if (this.$links.index(this.$link) === -1) {
    throw "Cannot find $link among $links";
  }

  // Progress bar?
  var xhr2capable = ('onprogress' in new XMLHttpRequest);
  this.progressbarCapable = xhr2capable && this.options.progressbar || false;

  // compute nth
  this.l = this.$links.length;
  this.nth = this.$links.index(this.$link) + 1;

  // backup html's initial overflow and make it hidden
  this.htmlOverflowOrig = $('html').css('overflow');
  $('html').css('overflow', 'hidden');

  // render markup
  this.$el =        $('<div class="lightbox"></div>').appendTo(document.body);
  this.$esc =         $('<a class="kbd close" href="javascript:void 0;">Close <kbd>ESC</kbd></a>').prependTo(this.$el);
  this.$img =         $('<img src="" alt>').appendTo(this.$el);
  this.$nav =         $('<nav></nav>').appendTo(this.$el);
  this.$prev =          $('<a class="kbd" rel="prev" href="javascript:void 0;"><kbd>LEFT</kbd> Previous</a>').appendTo(this.$nav);
  this.$next =          $('<a class="kbd" rel="next" href="javascript:void 0;">Next <kbd>RIGHT</kbd></a>').appendTo(this.$nav);
  if (this.l < 2) {
    this.$prev.hide(); // hide if links <2
    this.$next.hide(); // hide if links <2
  }
  this.$demo =        $('<a class="kbd demo" href="javascript:void 0;" target="_blank">Live demo <kbd>ENTER</kbd></a>').appendTo(this.$el);
  this.$progressbar = $('<div class="meter">').appendTo(this.$el);

  //
  // Render
  //

  if (this.options.transitionduration > 0) {
    this.$img.css({visibility: 'hidden'});

    this.render(this.$link, function () {
      var $smallimg = this.$link.find('img');
      this.zoomin($smallimg);
    }.bind(this));
  } else {
    this.render(this.$link);
  }

  this.setNth(this.nth);
  
  //
  // Events
  //

  // On 'click' $img => go next
  this.$img.click(function () {this.next(true); return false;}.bind(this));

  // On 'click' bubbles to $el => remove
  this.$el.click(function (e) {
    //console.log(e);

    if (e.target !== this.$demo[0]) { // don't close if click comes from demo link
      this.remove();
    }

    // don't return false here, to let click propagate to the page
  }.bind(this));

  //
  // Keyboard bindings
  //

  $(document).keydown(this.keydown.bind(this));

  //
  // Buttons
  //

  this.$esc.click(function () {this.remove(); return false;}.bind(this));
  this.$prev.click(function () {this.prev(); return false;}.bind(this));
  this.$next.click(function () {this.next(); return false;}.bind(this));
}
Lightbox.prototype.setNth = function (x) {
  this.nth = x;

  // disable $next button if last
  if (this.nth >= this.l) {
    this.$next.addClass('disabled');
  } else {
    this.$next.removeClass('disabled');
  }

  // disable $prev button if first
  if (this.nth <= 1) {
    this.$prev.addClass('disabled');
  } else {
    this.$prev.removeClass('disabled');
  }
};
Lightbox.prototype.render = function (link, cb) {
  //
  // image
  //
  var fullimg = $(link).attr('href');
  var smallimg = $(link).find('img').attr('src');

  function changeImg(url) {
    this.$img.one('load', cb);

    this.$img.attr('src', url);
  }
  changeImg = changeImg.bind(this);

  if (this.progressbarCapable) {
    function loadImg() {
      //this.$img.attr('src', smallimg);

      this.loading = loadImage(fullimg).progress(function (e) {
        if (e.lengthComputable) {
          this.$progressbar.css('width', e.loaded / e.total * 100 + '%')
        }
      }.bind(this)).done(function (url) {
        this.loading = undefined;
        this.$progressbar.css('width', '0%');

        changeImg(url);
      }.bind(this));
    }
    loadImg = loadImg.bind(this);

    // progress bar
    if (this.loading) {
      this.loading.dfd.reject(); // cancel previous one
      this.loading.xhr.abort();
      this.loading = undefined;

      loadImg();
    } else {
      loadImg();
    }
  } else {
    changeImg(fullimg);
  }

  //
  // demo link
  //

  var demoLink = $(link).data('lightbox-demo');

  if (demoLink && demoLink.length) {
    this.$demo.attr('href', demoLink);
    this.$demo.show();
  } else {
    this.$demo.attr('href', 'javascript:void 0;');
    this.$demo.hide();
  }

};
Lightbox.prototype.next = function (removeIfLast) {
  if (this.nth < this.l) {
    this.setNth(this.nth+1);
    this.render(this.$links.eq(this.nth-1));
    //console.log(this.nth);
  } else if (removeIfLast) {
    this.remove();
  }
};
Lightbox.prototype.prev = function (removeIfLast) {
  if (this.nth - 1 > 0) {
    this.setNth(this.nth-1);
    this.render(this.$links.eq(this.nth-1));
  } else if (removeIfLast) {
    this.remove();
  }
};
Lightbox.prototype.remove = function () {

  function thenRemove() {
    this.$el.remove();
    this.$el.unbind('keydown', this.keydown);

    // restore initial html's overflow
    $('html').css('overflow', this.htmlOverflowOrig);
  }
  thenRemove = thenRemove.bind(this);

  if (this.options.transitionduration > 0) {
    // find the corresponding small image in the gallery that matches the displayed (into $img) one
    var $smallimg = this.$links.filter(function (i, el) {return $(el).attr('href') === this.$img.attr('src');}.bind(this));
    
    this.zoomout($smallimg, thenRemove);
  } else {
    thenRemove();
  }
};
Lightbox.prototype.keydown = function (e) {
  function fakeActiveImpulse(el) {
    var $el = $(el);

    $el.addClass('active');
    setTimeout(function () {$el.removeClass('active');}, 50);
  }

  // ESC
  if (e.keyCode === 27) { 
    this.remove();
    fakeActiveImpulse(this.$esc);
    return false;
  }
  // LEFT
  if (e.keyCode === 37) { 
    this.prev();
    fakeActiveImpulse(this.$prev);
    return false;
  }
  // RIGHT
  if (e.keyCode === 39) { 
    this.next();
    fakeActiveImpulse(this.$next);
    return false;
  }
  // ENTER
  if (e.keyCode === 13) {
    fakeActiveImpulse(this.$demo);
    this.demo();
    return false;
  }
};
Lightbox.prototype.demo = function () {
  if (!this.$demo.is(':visible')) return;

  // http://stackoverflow.com/questions/4907843/open-url-in-new-tab-using-javascript
  var newWindow = window.open(this.$demo.attr('href'), '_blank');
  newWindow.focus();
};
Lightbox.prototype.zoomin = function ($smallimg, cb) {
  //alert('first img loaded');

  // cache some dimensions
  var smallimgDims = dims($smallimg);
  var imgDims = dims(this.$img);

  // Position and scale the big image exactly on the small one
  this.$img.css({transform: 'translate(' + ((smallimgDims.l + smallimgDims.w/2) - (imgDims.l + imgDims.w/2)) + 'px, ' + ((smallimgDims.t + smallimgDims.h/2) - (imgDims.t + imgDims.h/2)) + 'px) scale(' + (smallimgDims.w / imgDims.w) + ')'});
  setTimeout(function () {
    // then, undo with a transition
    this.$img.css({
      visibility: 'visible',
      transition: 'all ' + this.options.transitionduration + 'ms',
      transform: 'translate(0px, 0px) scale(1)'
    });

    // cb
    setTimeout(function () {
      cb && cb();
    }.bind(this), this.options.transitionduration);
  }.bind(this), 30);
};
Lightbox.prototype.zoomout = function ($smallimg, cb) {
  // cache some dimensions
  var smallimgDims = dims($smallimg);
  var imgDims = dims(this.$img);

  this.$img.css({
    transition: 'all ' + this.options.transitionduration + 'ms',
    transform: 'translate(0px, 0px) scale(1)'
  });
  setTimeout(function () {
    this.$img.css({
      transform: 'translate(' + ((smallimgDims.l + smallimgDims.w/2) - (imgDims.l + imgDims.w/2)) + 'px, ' + ((smallimgDims.t + smallimgDims.h/2) - (imgDims.t + imgDims.h/2)) + 'px) scale(' + (smallimgDims.w / imgDims.w) + ')',
      //opacity: 0,
      //backgroundColor: 'transparent'
    });

    // cb
    setTimeout(function () {
      cb && cb();
    }.bind(this), this.options.transitionduration);
  }.bind(this), 0);
};

