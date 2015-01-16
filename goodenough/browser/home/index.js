var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');

require('jquery-waypoints');
require('jquery-waypoints-sticky');
require('jquery-hammer');
require('velocity-animate');

var FTScroller = require('ftscroller');

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

var epsilon = function ( value ) {
  return Math.abs( value ) < 0.000001 ? 0 : value;
};
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
  /*var elements = this.matrixWorld.elements;
  this.rotation.set(epsilon(Math.asin(elements[5])), epsilon(Math.acos(elements[0])));*/
  
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
          //t.push(_t);
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
    true && (function () {

      // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
      function distw(width, fov, aspect) {
        //return 2*height/Math.tan(2*fov/(180 /Math.PI))
        //return 2*height / Math.tan(fov*(180/Math.PI)/2);
        return ((width/aspect)/Math.tan((fov/2)/(180/Math.PI)))/2;
      }
      function disth(height, fov, aspect) {
        return (height/Math.tan((fov/(180/Math.PI))/2))/2;
      }
      
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

      var camera = new THREE.PerspectiveCamera(30, WW/WH, -1000, 1000);
      window.camera = camera;

      camera.position.set(WW/2, WH/2, -distw(WW, camera.fov, camera.aspect)); // camera.position.z === -perspective
      camera.up.set(0, -1, 0);

      var lookAt = new THREE.Vector3(WW/2,WH/2,-1);
      window.lookAt = lookAt;
      camera.lookAt(lookAt);

      var renderer = new THREE.CSS3DRenderer($scene[0], $camera[0]);
      window.renderer = renderer;
      //renderer.domElement.style.position = 'absolute';

      var scene = new THREE.Scene();
      window.scene = scene;

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

        var css3dobject = $mba.data('css3dobject');
        var theta = 60*Math.PI/180;

        var d = disth(WH*Math.cos(theta), camera.fov, camera.aspect);

        if (activeMacbook !== $mba[0]) {
          activeMacbook = $mba[0];

          
          new TWEEN.Tween(css3dobject.rotation).to({z: -3*Math.PI/180}, 300).start();
        
          // set new position before new rot
          var p0 = new THREE.Vector3().copy(camera.position);
          var p = new THREE.Vector3(WW/2, WH/2 + d*Math.sin(theta), -d);
          camera.position.set(p.x, p.y, p.z);
          // set new
          var r0 = new THREE.Euler().copy(camera.rotation);
          var lookAt = new THREE.Vector3(WW/2, WH/2, 0);
          camera.lookAt(lookAt);
          var r = new THREE.Euler().copy(camera.rotation);
          
          camera.position.set(p0.x, p0.y, p0.z);
          camera.rotation.set(r0.x, r0.y, r0.z);
          new TWEEN.Tween(camera.position).to({
            x: p.x,
            y: p.y,
            z: p.z
          }, 300).start();
          new TWEEN.Tween(camera.rotation).to({
            x: r.x + 2*Math.PI, // gimbal !!!
            y: r.y,
            z: r.z
          }, 300).start();

        } else {
          
          new TWEEN.Tween(css3dobject.rotation).to({z: 3*Math.PI/180}, 300).start();

          new TWEEN.Tween(camera.position).to({
            x: WW/2,
            y: WH/2,
            z: -distw(WW, camera.fov, camera.aspect)
          }, 300).start();
          new TWEEN.Tween(camera.rotation).to({
            x: Math.PI,
            y: 0,
            z: 0
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

    //
    // Scroller
    //

    var $scroller = this.$('#scroller');
    $('html, body').css('overflow', 'hidden');
    var ftscroller = new FTScroller($scroller[0], {
      bouncing: false,
      scrollbars: false,
      scrollingX: false,
      //contentHeight: undefined,
      updateOnWindowResize: true
    });

  }
});

module.exports = HomeView;