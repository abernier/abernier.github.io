var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');
Backbone.$ = $;

require('jquery-waypoints');
require('jquery-waypoints-sticky');

require('jquery-hammer');

var srcset = require('srcset');

var HomeView = require('./home');

function makeRemoveClassHandler(regex) {
  return function (index, classes) {
    return classes.split(/\s+/).filter(function (el) {return regex.test(el);}).join(' ');
  }
}

// http://stackoverflow.com/questions/11381673/javascript-solution-to-detect-mobile-browser
function isMobile() {
  return typeof window.orientation !== 'undefined';
}

function smoothScroll(el, duration) {
  duration || (duration = 600);

  if ($('html').is('.touch')) {
    //duration = 0;
  }

  setTimeout(function () {
    //$(window).scrollTo(el, duration);
    $('html').velocity('stop', true).velocity('scroll', {axis: 'y', offset: $(el).offset().top, duration: duration});
  }, 0);
}

var Router = Backbone.Router.extend({
    initialize: function (options) {
      this.options = options;

      //
      // debug
      //
      if (window.location.search.indexOf('?debug') !== -1) {
        $('html').addClass('debug');
      }

      $(function () {
        // DOM ready
        $('html').addClass('domready');
        // just after DOM ready (for styling convenience)
        setTimeout(function () {
          $('html').addClass('justafterdomready');
          $(document).trigger('justafterdomready');
        }, 0);

        if (isMobile()) {
          $('html').addClass('mobile');
        } else {
          $('html').addClass('no-mobile');
        }

        var historyOptions = {
          pushState: true,
          hashChange: false, // no pushState => full refreshes (<=IE9)
          //silent: true
        };
        if (options && options.history && options.history.root) {
        	historyOptions.root = options.history.root;
        }

        Backbone.history.start(historyOptions);
      });

      // Trap anchors
      this.on('target', this.target);
      $(document.body).delegate('a[href^="#"]', 'click', function (e) {
        e.preventDefault();

        var $target = $($(e.currentTarget).attr('href')).eq(0);

        if (!$target.length) {
          return;
        }

        // trig 'target' router event
        this.trigger('target', $(e.currentTarget), $target);
      }.bind(this));
      $(document.body).delegate('a[href="#"]', 'click', function (e) {
        e.preventDefault();

        smoothScroll(document.body);
      });

      //
      // srcset
      //

      (function () {
        var viewportInfo = new srcset.ViewportInfo();
        viewportInfo.compute();

        var windowResizedAt = (new Date).getTime();

        function update($el) {
          var needUpdate = (!$el.data('src-updatedat') || $el.data('src-updatedat') < windowResizedAt);
          if (!$el.is('[src]') || needUpdate) {

            var srcsetInfo = new srcset.SrcsetInfo({
              src: $el[0].src,
              srcset: $el.data('srcset')
            });

            if (srcsetInfo) {
              var imageInfo = viewportInfo.getBestImage(srcsetInfo);

              $el.attr('src', imageInfo.src);
              setTimeout(function () {
                $el.trigger('srcchanged');
              }, 0);
            }

            // Remember when updated to compare with window's resizeAt timestamp
            $el.data('src-updatedat', (new Date).getTime());
          }
        }

        function updateAllSrcset() {
          // update timestamp
          windowResizedAt = (new Date).getTime();
          viewportInfo.compute();

          // Update every images
          $('img[data-srcset]').each(function (i, el) {
            update($(el));
          });
        }
        $(window).resize(_.debounce(updateAllSrcset, 250));
        updateAllSrcset();
      }());

      //
      // .img with srcset change
      //

      $('.img').has('>img[src]').each(function (i, el) {
        var $el = $(el);
        var $img = $el.find('>img').eq(0);

        $el.css('background-image', 'url(' + $img.attr('src') + ')');

        $img.on('srcchanged', function (e) {
          $img.parent().css('background-image', 'url(' + $img.attr('src') + ')');
        });
      });

      //
      // setheight
      //

      /*(function () {
        var previousHeight;

        var $html = $('html');

        // https://gist.github.com/scottjehl/2051999
        function viewportSize() {
          var test = document.createElement( "div" );
         
          test.style.cssText = "position: fixed;top: 0;left: 0;bottom: 0;right: 0;";
          document.documentElement.insertBefore( test, document.documentElement.firstChild );
          
          var dims = { width: test.offsetWidth, height: test.offsetHeight };
          document.documentElement.removeChild( test );
          
          return dims;
        }
        function setHeight() {
          //console.log('setting height...')
          previousHeight = $html.css('height');

          $html.height(viewportSize().height)
          $html.trigger('setheight');
        }
        if (!$html.is('touch')) { // don't resize for mobile since window size can't really change...
          $(window).resize(_.debounce(setHeight, 200));
        }

        $(window).on('orientationchange', _.debounce(setHeight, 200));
        setTimeout(setHeight, 0);
        setTimeout(setHeight, 500); // another try few later in case address bar auto-hiding makes the size change
        setTimeout(setHeight, 1000); // another try few later in case address bar auto-hiding makes the size change
      }).call(this);*/

      //
      // Waypoints
      //

      /*$(function () {
        var $sections = $('[data-waypoint]');

        // Section enters the viewport (from bottom)
        $sections.waypoint({
          handler: function (direction) {
            //console.log(direction);

            if (direction !== 'down') return;
            //console.log('down');

            $(document).trigger('inview', {
              el: this,
              direction: 'down'
            });
          },
          offset: '100%'
        });
        // Section enters the viewport (from the top)
        $sections.waypoint({
          handler: function (direction) {
            //console.log(direction);

            if (direction !== 'up') return;
            //console.log('up');

            $(document).trigger('inview', {
              el: this,
              direction: 'up'
            });
          },
          offset: function () {
            return -1*$(this).outerHeight(true);
          }
        });

        // Section exits the viewport (from top)
        $sections.waypoint({
          handler: function (direction) {
            //console.log(direction);

            if (direction !== 'down') return;
            //console.log('down');

            $(document).trigger('outview', {
              el: this,
              direction: 'down'
            });
          },
          offset: function () {
            return -1*$(this).outerHeight(true);
          }
        });
        // Section exits the viewport (from the bottom)
        $sections.waypoint({
          handler: function (direction) {
            //console.log(direction);

            if (direction !== 'up') return;
            //console.log('up');

            $(document).trigger('outview', {
              el: this,
              direction: 'up'
            });
          },
          offset: '100%'
        });
      }.bind(this));*/

    },
    routes: {
      '(/)(index.html)': 'home'
    },
    home: function () {
      console.log('home');

      this.mainView = new HomeView({el: 'body'});
    },
    target: function (from, to, options) {
      options || (options = {});

      //console.log('target', this, arguments);
      var $to = $(to);

      if (!$to.length) return;

      $('.target').eq(0).removeClass('target');
      $to.addClass('target');

      // scrollTo
      if (options.scroll !== false) {
        smoothScroll($to, options.scroll && options.scroll.duration);  
      }
      
    }
});

this.Goodenough = Router;
if (typeof module !== "undefined" && module !== null) {
  module.exports = this.Goodenough;
}