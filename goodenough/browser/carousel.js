var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');
require('jquery-hammer');
require('velocity-animate');

var CarouselView = require('carouselview');
var Carousel = CarouselView.extend({
  initialize: function (options) {
    CarouselView.prototype.initialize.apply(this, arguments);

    if (options.prev) {
      this.$prev.hammer().on('tap', this.prev.bind(this));
    }
    if (options.next) {
      this.$next.hammer().on('tap', this.next.bind(this));
    }

    this.$ul = this.$el;

    var toggleDisable = function (index) {
      this.$prev && this.$prev.toggleClass('disabled', (index <=0));
      this.$next && this.$next.toggleClass('disabled', (index+1 >= this.$items.length));
    };
    toggleDisable = toggleDisable.bind(this);
    toggleDisable(this.currentIndex);

    if (options.pagesNav && options.pagesNav.length) {
      var $pagesNav = $(options.pagesNav);

      $pagesNav.hammer().on('tap', function (e) {
        e.stopPropagation();

        var index = $pagesNav.index(e.currentTarget);

        this.go(index);
      }.bind(this));
    }

    this.on('carouselchange', function () {
      //console.log('carouselchange', this);

      this.scrollto(this.$nth(this.currentIndex));
      
      toggleDisable(this.currentIndex);

      // pages nav
      if (options.pagesNav && options.pagesNav.length) {
        var $pagesNav = $(options.pagesNav);

        $pagesNav.removeClass('active').eq(this.currentIndex).addClass('active');
      }

    }.bind(this));

    // auto prev/next
    (function () {
      var w;
      var setW = function () {w = this.$el.width();};
      setW = setW.bind(this);

      $(window).on('resize', _.debounce(function () {setW();}, 200));
      setW();

      this.$el.hammer().on('tap', function (e) {
        console.log('tap')
        e.stopPropagation();

        if (e.gesture.center.x > w/2) {
          this.next();
        } else {
          this.prev();
        }
      }.bind(this));
    }).call(this);

    // resize
    $(window).on('resize orientationchange', _.debounce(function () {
      this.scrollto(this.$nth(this.currentIndex));
    }.bind(this), 200));

    this.$items.css('pointer-events', 'none');
    this.$el.hammer({velocity: .5})
      .on('swipeleft', this.next.bind(this))
      .on('swiperight', this.prev.bind(this))
      ;

    //this.go(0);
  },
  scrollto: function (el) {
    var $el = $(el);
    el = $el[0];

    $el.velocity('stop', true).velocity('scroll', {axis: 'x', container: this.$ul, duration: 200});

  }
});

module.exports = Carousel;