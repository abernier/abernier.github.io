require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');

require('jquery-waypoints');
require('jquery-waypoints-sticky');
require('jquery-hammer');
require('velocity-animate');


$.fn.offsetRelative = function offsetRelative(selector) {
  var $el = this;
  var $parent = $el.parent();
  if (selector) {
    $parent = $parent.closest(selector);
  }

  var elOffset     = $el.offset();
  var parentOffset = $parent.offset();

  return {
    left: elOffset.left - parentOffset.left,
    top: elOffset.top - parentOffset.top
  };
};

var Loop = require('loop');

var TWEEN = require('tween');
window.TWEEN = TWEEN;

var THREE = require('three');
window.THREE = THREE;
THREE.CSS3DObject = function ( element ) {
	THREE.Object3D.call( this );

	this.element = element;
  var $el = $(this.element);

  var offset = $el.offset();
  this.position.set(offset.left, offset.top, 0);
  this.dims = {
    w: $el.width(),
    h: $el.height()
  };
  
	//this.element.style.position = 'absolute';
  $el.parentsUntil('#scene').andSelf().each(function (i, el) {
    if ($el.css('position') === 'static') {
      //$el.css('position', 'relative');
    }
     
    if ($el.css('transform-style') !== 'preserve-3d') {
      $el.css('transform-style', 'preserve-3d');
    }
    if ($el.css('overflow') !== 'visible') {
      $el.css('overflow', 'visible');
    }
   });
  
   /*this.element.style.WebkitTransformStyle = 'preserve-3d';
	this.element.style.MozTransformStyle = 'preserve-3d';
	this.element.style.oTransformStyle = 'preserve-3d';
	this.element.style.transformStyle = 'preserve-3d';*/

	this.addEventListener( 'removed', function ( event ) {

		if ( this.element.parentNode !== null ) {

			this.element.parentNode.removeChild( this.element );

		}

	} );

};
THREE.CSS3DObject.prototype = Object.create( THREE.Object3D.prototype );
//
THREE.CSS3DRenderer = function (domElement, cameraElement) {

	console.log( 'THREE.CSS3DRenderer', THREE.REVISION );

	var _width, _height;
	var _widthHalf, _heightHalf;

	var matrix = new THREE.Matrix4();
	
	var cache = {
		camera: { fov: 0, style: '' },
		objects: {}
	};

	var domElement = domElement || document.createElement( 'div' );
	this.domElement = domElement;

	domElement.style.overflow = 'hidden';

	domElement.style.WebkitTransformStyle = 'preserve-3d';
	domElement.style.MozTransformStyle = 'preserve-3d';
	domElement.style.oTransformStyle = 'preserve-3d';
	domElement.style.transformStyle = 'preserve-3d';

	var cameraElement = cameraElement || document.createElement( 'div' ) && domElement.appendChild(cameraElement);
  $(cameraElement).addClass('cam3d');

	cameraElement.style.WebkitTransformStyle = 'preserve-3d';
	cameraElement.style.MozTransformStyle = 'preserve-3d';
	cameraElement.style.oTransformStyle = 'preserve-3d';
	cameraElement.style.transformStyle = 'preserve-3d';

	if ($(cameraElement).css('position') === 'static') {
     $(cameraElement).css('position', 'relative');
   }
  
   this.setClearColor = function () {

	};

	this.setSize = function ( width, height ) {

		_width = width;
		_height = height;

		_widthHalf = _width / 2;
		_heightHalf = _height / 2;

		domElement.style.width = width + 'px';
		domElement.style.height = height + 'px';

		cameraElement.style.width = width + 'px';
		cameraElement.style.height = height + 'px';

	};

	var epsilon = function ( value ) {

		return Math.abs( value ) < 0.000001 ? 0 : value;

	};

	var getCameraCSSMatrix = function ( matrix ) {

		var elements = matrix.elements;

		return 'matrix3d(' +
			epsilon( elements[ 0 ] ) + ',' +
			epsilon(- elements[ 1 ] ) + ',' +
			epsilon( elements[ 2 ] ) + ',' +
			epsilon( elements[ 3 ] ) + ',' +
			epsilon( elements[ 4 ] ) + ',' +
			epsilon( -elements[ 5 ] ) + ',' +
			epsilon( elements[ 6 ] ) + ',' +
			epsilon( elements[ 7 ] ) + ',' +
			epsilon( elements[ 8 ] ) + ',' +
			epsilon(- elements[ 9 ] ) + ',' +
			epsilon( elements[ 10 ] ) + ',' +
			epsilon( elements[ 11 ] ) + ',' +
			epsilon( elements[ 12 ] ) + ',' +
			epsilon(- elements[ 13 ] ) + ',' +
			epsilon( elements[ 14 ] ) + ',' +
			epsilon( elements[ 15 ] ) +
		')';

	};

	var getObjectCSSMatrix = function (object, matrix ) {

		var elements = matrix.elements;

      var t = '';
    
      if (object.element.parentNode === cameraElement) {
        t = 'translate3d(-50%,-50%,0)';
      }
    
      var el = object.element;
      var $el = $(el);
      if (!$el.data('original-transform')) {
        $el.data('original-transform', $el.css('transform'));
      }
    
      var originalTransform = $el.data('original-transform');
      if (originalTransform === 'none') {
        originalTransform = '';
      }
      t += ' ' + originalTransform;
    
      t += ' matrix3d(' +
			epsilon( elements[ 0 ] ) + ',' +
			epsilon( elements[ 1 ] ) + ',' +
			epsilon( elements[ 2 ] ) + ',' +
			epsilon( elements[ 3 ] ) + ',' +
			epsilon( elements[ 4 ] ) + ',' +
			epsilon( elements[ 5 ] ) + ',' +
			epsilon( elements[ 6 ] ) + ',' +
			epsilon( elements[ 7 ] ) + ',' +
			epsilon( elements[ 8 ] ) + ',' +
			epsilon( elements[ 9 ] ) + ',' +
			epsilon( elements[ 10 ] ) + ',' +
			epsilon( elements[ 11 ] ) + ',' +
			epsilon( elements[ 12 ] - object.position.x ) + ',' +
			epsilon( elements[ 13 ] - object.position.y ) + ',' +
			epsilon( elements[ 14 ] ) + ',' +
			epsilon( elements[ 15 ] ) +
		')';
    
    return t;

	};

	var renderObject = function ( object, camera ) {

		if ( object instanceof THREE.CSS3DObject ) {

			var style;

			var t = [];
      $(object.element).parentsUntil('#camera').each(function (i,el) {
        var _t = $(el).css('transform');
        if (_t !== 'none') {
          t.push(_t);
        }
      });
      style = t.reverse().join(' ') + ' ' + getObjectCSSMatrix(object,  object.matrixWorld );

			var element = object.element;
			var cachedStyle = cache.objects[ object.id ];

			if ( cachedStyle === undefined || cachedStyle !== style ) {

				element.style.WebkitTransform = style;
				element.style.MozTransform = style;
				element.style.oTransform = style;
				element.style.transform = style;

				cache.objects[ object.id ] = style;

			}

			if ( element.parentNode !== cameraElement ) {

				//cameraElement.appendChild( element );

			}

		}

		for ( var i = 0, l = object.children.length; i < l; i ++ ) {

			renderObject( object.children[ i ], camera );

		}

	};

	this.render = function ( scene, camera ) {

		var fov = 0.5 / Math.tan( THREE.Math.degToRad( camera.fov * 0.5 ) ) * _height;

		if ( cache.camera.fov !== fov ) {

			domElement.style.WebkitPerspective = fov + "px";
			domElement.style.MozPerspective = fov + "px";
			domElement.style.oPerspective = fov + "px";
			domElement.style.perspective = fov + "px";
      console.log('changing camera perspective');

			cache.camera.fov = fov;

		}

		scene.updateMatrixWorld();

		if ( camera.parent === undefined ) camera.updateMatrixWorld();

		camera.matrixWorldInverse.getInverse( camera.matrixWorld );

		var style = "translate3d(0,0," + fov + "px)" + getCameraCSSMatrix( camera.matrixWorldInverse ) +
			" translate3d(" + _widthHalf + "px," + _heightHalf + "px, 0)";

		if ( cache.camera.style !== style ) {

			cameraElement.style.WebkitTransform = style;
			cameraElement.style.MozTransform = style;
			cameraElement.style.oTransform = style;
			cameraElement.style.transform = style;
      console.log('changing camera transform');
			
			cache.camera.style = style;

		}

		renderObject( scene, camera );

	};

};

var HomeView = Backbone.View.extend({
  initialize: function (options) {
    this.options = options;

    console.log('homeView');

    var $scene = this.$('#scene');
    var $camera = this.$('#camera');
    var $window = $(window);
    (function () {
      
      var WW;
      function setWW() {
        WW = $window.width();
      }
      setWW();
      $window.resize(setWW);

      var WH = $window.height();
      function setWH() {
        WH = $window.height();
      }
      setWH();
      $window.resize(setWH);

      var camera = new THREE.PerspectiveCamera(30, 1, -1000, 1000);
      window.camera = camera;

      camera.position.set(WW/2, WH/2, -1500);
      camera.up.set(0, -1, 0);

      var lookAt = new THREE.Vector3(WW/2,WH/2,0);
      window.lookAt = lookAt;
      camera.lookAt(lookAt);

      var renderer = new THREE.CSS3DRenderer($scene[0], $camera[0]);
      window.renderer = renderer;
      //renderer.domElement.style.position = 'absolute';

      var scene = new THREE.Scene();

      $('.obj').each(function (i, el) {
        var $el = $(el);

        var obj = new THREE.CSS3DObject(el);
        $el.data('css3dobject', obj);

        //var offset = $el.offset();
        //obj.position.set(offset.left,offset.top,0);

        console.log('obj', obj.getWorldPosition());
        scene.add(obj);
      });


      function onresize() {
        camera.aspect = WW/WH;
        camera.updateProjectionMatrix();

        renderer.setSize(WW, WH);
      }
      onresize();
      $window.resize(onresize);

      function update() {
        camera.updateProjectionMatrix();
      }
      function draw() {
        camera.updateProjectionMatrix();
        
        renderer.render(scene, camera);
      }
      window.draw = draw;
      draw();

      var clock = new THREE.Clock();
      var renderLoop = new Loop(function (t, t0) {
        //update(clock.getDelta());
        draw();
        TWEEN.update(t);
      });
      renderLoop.start();

      var dat = require('dat-gui');
      var gui = new dat.GUI();
      var f1 = gui.addFolder('camera.position');
      var px = f1.add(camera.position, 'x', -1000, 1000);
      var py = f1.add(camera.position, 'y', -1000, 3000);
      var pz = f1.add(camera.position, 'z', -5000, 0);
      px.onChange(function (val) {
        draw();
      });
      py.onChange(function (val) {
        draw();
      });
      pz.onChange(function (val) {
        draw();
      });

      var f2 = gui.addFolder('camera.rotation');
      var rx = f2.add(camera.rotation, 'x', 0, 2*Math.PI);
      var ry = f2.add(camera.rotation, 'y', 0, 2*Math.PI);
      var rz = f2.add(camera.rotation, 'z', 0, 2*Math.PI);
      rx.onChange(function (val) {
        draw();
      });
      ry.onChange(function (val) {
        draw();
      });
      rz.onChange(function (val) {
        draw();
      });

      var f3 = gui.addFolder('camera.lookAt');
      var cx = f3.add(lookAt, 'x', -1000, 1000);
      var cy = f3.add(lookAt, 'y', -1000, 1000);
      var cz = f3.add(lookAt, 'z', -1000, 1000);
      cx.onChange(function (val) {
        camera.lookAt(lookAt);
        rx.updateDisplay();
        draw();
      });
      cy.onChange(function (val) {
        camera.lookAt(lookAt);
        ry.updateDisplay();
        draw();
      });
      cz.onChange(function (val) {
        camera.lookAt(lookAt);
        rz.updateDisplay();
        draw();
      });

      // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object

      var activeMacbook;
      this.$('.macbook').on('click', function (e) {
        console.log('click');
      	var $mba = $(this);

        var height = 1.5*WH
        var dist = 2*height/Math.tan(2*camera.fov/(180 /Math.PI)); // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object

        var css3dobject = $mba.data('css3dobject');
        var pos = css3dobject.position;
        var dims = css3dobject.dims;
        var theta = 60*Math.PI/180;

        if (activeMacbook !== $mba[0]) {
          activeMacbook = $mba[0];

          new TWEEN.Tween(camera.rotation).to({x: 240*Math.PI/180}, 300).start();
          
          new TWEEN.Tween(camera.position).to({
            x: pos.x + dims.w/2,
            y: dist*Math.cos(Math.PI/2-theta) + pos.y,
            z: -(dist*Math.cos(theta))
          }, 300).start();
        } else {
          new TWEEN.Tween(camera.rotation).to({x: 180*Math.PI/180}, 300).start();

          new TWEEN.Tween(camera.position).to({
            x: pos.x + dims.w/2,
            y: pos.y + dims.h/2,
            z: -1500
          }, 300).start();

          activeMacbook = undefined;
        }
        
      });

      

    }).call(this);

    //
    // scale
    //

    /*(function () {
      var SCALE = 2;

      $('.scale').each(function (i, el) {
        var $scale = $(el);
        var $in = $scale.find('>.in');
        var $obj = $in.find('>*').eq(0);

        var dims = {
          w: $obj.width(),
          h: $obj.height(),
          margin: {
            left: parseInt($obj.css('margin-left'), 10),
            top: parseInt($obj.css('margin-top'), 10),
            right: parseInt($obj.css('margin-right'), 10),
            bottom: parseInt($obj.css('margin-bottom'), 10)
          }
        };

        $in.css('font-size', (100*SCALE)+'%');
        $scale.css({
          transform: 'scale(' + (1/SCALE) + ')',
          marginTop: (dims.margin.top - ((dims.h*SCALE - dims.h)/2)),
          marginBottom: (dims.margin.bottom - ((dims.h*SCALE - dims.h)/2)),
          marginLeft: (dims.margin.left - ((dims.w*SCALE - dims.w)/2)),
          marginRight: (dims.margin.right - ((dims.w*SCALE - dims.w)/2))
        });

      });
    }).call(this);*/
  }
});

module.exports = HomeView;
},{"backbone":"backbone","dat-gui":"dat-gui","jquery":"jquery","jquery-hammer":"jquery-hammer","jquery-waypoints":"jquery-waypoints","jquery-waypoints-sticky":"jquery-waypoints-sticky","loop":"loop","three":"three","tween":"tween","underscore":"underscore","velocity-animate":"velocity-animate"}],"Goodenough":[function(require,module,exports){
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

      new HomeView({el: 'body'});
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
},{"./home":1,"backbone":"backbone","jquery":"jquery","jquery-hammer":"jquery-hammer","jquery-waypoints":"jquery-waypoints","jquery-waypoints-sticky":"jquery-waypoints-sticky","srcset":"srcset","underscore":"underscore"}]},{},[]);
