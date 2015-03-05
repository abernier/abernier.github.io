(function () {
	var $ = this.jQuery || require('jquery');
	var domvertices = this.domvertices || require('domvertices');

	function V(el, options) {
    options || (options = {});

    this.options = $.extend({}, $.fn.domvertices.defaults, options);

    this.$el = $(el);
    this.el = this.$el[0];

		this.update();
	}
	V.prototype.update = function () {
		var v = domvertices(this.el, {root: this.options.root});

		this.a = v.a;
		this.b = v.b;
		this.c = v.c;
		this.d = v.d;
    this.matrix = v.matrix;

    return this;
	};
  V.prototype.trace = function () {
    var position = {
      display:'block',width:'0px',height:'0px', boxShadow:'0 0 0 3px lime',
      position:'absolute',left:'0px',top:'0px'
    };
    this.$a || (this.$a = $('<div>').appendTo(this.options.append).css(position));
    this.$b || (this.$b = $('<div>').appendTo(this.options.append).css(position));
    this.$c || (this.$c = $('<div>').appendTo(this.options.append).css(position));
    this.$d || (this.$d = $('<div>').appendTo(this.options.append).css(position));

    var v = {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d
    };
    for (k in v) {
      this['$'+k].css({transform:'translate3d(' + v[k].x + 'px,' + v[k].y + 'px, ' + v[k].z + 'px)'});
    }

    return this;
  };
  V.prototype.erase = function () {
    this.$a.remove();
    this.$b.remove();
    this.$c.remove();
    this.$d.remove();

    this.$a = undefined;
    this.$b = undefined;
    this.$c = undefined;
    this.$d = undefined;

    return this;
  };

  var arr = [];
	$.fn.domvertices = function (options) {
		var v = new V(this[0], options);
    arr.push(v);

    this.data('v', v);

    return v;
	};
  $.fn.domvertices.v = arr;


  $.fn.domvertices.defaults = {
    append: document.body,
    root: document.body.parentNode
  };
}).call(this);