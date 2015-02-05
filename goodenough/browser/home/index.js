var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');

//require('jquery-waypoints');
//require('jquery-waypoints-sticky');
require('jquery-hammer');
//require('velocity-animate');

var FTScroller = require('ftscroller');

var CarouselView = require('carouselview');

var domvertices = require('domvertices');
require('jquery-domvertices');

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
			epsilon( -elements[ 0 ] ) + ',' +
			epsilon(-elements[ 1 ] ) + ',' +
			epsilon( elements[ 2 ] ) + ',' +
			epsilon( elements[ 3 ] ) + ',' +

			epsilon( -elements[ 4 ] ) + ',' +
			epsilon(-elements[ 5 ] ) + ',' +
			epsilon( elements[ 6 ] ) + ',' +
			epsilon( elements[ 7 ] ) + ',' +

			epsilon( -elements[ 8 ] ) + ',' +
			epsilon(-elements[ 9 ] ) + ',' +
			epsilon( elements[ 10 ] ) + ',' +
			epsilon( elements[ 11 ] ) + ',' +

			epsilon( -elements[ 12 ] ) + ',' +
			epsilon(-elements[ 13 ] ) + ',' +
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
			" translate3d(" + _widthHalf + "px," + _heightHalf + "px, 0) ";

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

var $window = $(window);
var $document = $(document);
var $html = $('html');
var $body = $('body');

var CameraView = Backbone.View.extend({
  initialize: function (options) {
    this.options = options;

    this.camera = new THREE.PerspectiveCamera(30, options.width/options.height, -1000, 1000);

    this.moveAndLookAt = this.moveAndLookAt.bind(this);
    this.moveAndLookAtElement = this.moveAndLookAtElement.bind(this);
  },
  moveAndLookAt: function (dstpos, dstlookat, options) {
    var camera = this.camera;

    options || (options = {});
    _.defaults(options, {
      duration: 300,
      up: camera.up
    });

    var origpos = new THREE.Vector3().copy(camera.position); // original position
    var origrot = new THREE.Euler().copy(camera.rotation); // original rotation

    camera.position.set(dstpos.x, dstpos.y, dstpos.z);
    camera.up.set(options.up.x, options.up.y, options.up.z);
    camera.lookAt(dstlookat);
    var dstrot = new THREE.Euler().copy(camera.rotation)

    // reset original position and rotation
    camera.position.set(origpos.x, origpos.y, origpos.z);
    camera.rotation.set(origrot.x, origrot.y, origrot.z);

    //
    // Tweening
    //

    // position
    new TWEEN.Tween(camera.position).to({
      x: dstpos.x,
      y: dstpos.y,
      z: dstpos.z
    }, options.duration).start();;

    // rotation (using slerp)
    (function () {
      var qa = new THREE.Quaternion().copy(camera.quaternion); // src quaternion
      var qb = new THREE.Quaternion().setFromEuler(dstrot); // dst quaternion
      var qm = new THREE.Quaternion();
      //camera.quaternion = qm;

      var o = {t: 0};
      new TWEEN.Tween(o).to({t: 1}, options.duration).onUpdate(function () {
        THREE.Quaternion.slerp(qa, qb, qm, o.t);
        camera.quaternion.set(qm.x, qm.y, qm.z, qm.w);
      }).start();
    }).call(this);
  },
  moveAndLookAtElement: function (el, options) {
    var camera = this.camera;

    options || (options = {});
    _.defaults(options, {
      duration: 300,
      distance: undefined,
      distanceTolerance: 0/100
    });

    // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
    function distw(width, fov, aspect) {
      //return 2*height/Math.tan(2*fov/(180 /Math.PI))
      //return 2*height / Math.tan(fov*(180/Math.PI)/2);
      return ((width/aspect)/Math.tan((fov/2)/(180/Math.PI)))/2;
    }
    function disth(height, fov, aspect) {
      return (height/Math.tan((fov/(180/Math.PI))/2))/2;
    }

    var v = $(el).domvertices().data('v');
    console.log('v.a', v.a);

    var ac = new THREE.Vector3().subVectors(v.c, v.a);
    var ab = new THREE.Vector3().subVectors(v.b, v.a);
    var ad = new THREE.Vector3().subVectors(v.d, v.a);

    var faceCenter = new THREE.Vector3().copy(ac).divideScalar(2)
    console.log('faceCenter', faceCenter);
    var faceNormal = new THREE.Vector3().copy(ab).cross(ac).normalize();
    console.log('faceNormal', faceNormal);

    //
    // Auto-distance (to fit width/height)
    //

    if (typeof options.distance === 'undefined' || options.distance === null) {
      var w = new THREE.Vector3().copy(ab).cross(faceNormal).length();
      var h = new THREE.Vector3().copy(ad).cross(faceNormal).length();
      //console.log(w, h);

      var tolerance = 0/100;
      if (camera.aspect > w/h) { // camera larger than element
        if (w>h) {
          distance = disth(h+h*options.distanceTolerance, camera.fov, camera.aspect);
        } else {
          distance = distw(w+w*options.distanceTolerance, camera.fov, camera.aspect);  
        }
      } else {
        if (w>h) {
          distance = distw(w+w*options.distanceTolerance, camera.fov, camera.aspect);
        } else {
          distance = disth(h+h*options.distanceTolerance, camera.fov, camera.aspect);  
        }
      }
      
    }
    
    var dstlookat = new THREE.Vector3().copy(faceCenter).add(v.a);
    var dstpos = new THREE.Vector3().copy(faceNormal).setLength(distance).add(dstlookat);

    console.log('dstlookat', dstlookat, 'dstpos', dstpos);

    this.moveAndLookAt(dstpos, dstlookat, {
      duration: options.duration,
      up: new THREE.Vector3().copy(ad).negate()
    });
  }
});

var HomeView = Backbone.View.extend({
  initialize: function (options) {
    this.options = options;

    //console.log('homeView');

    var $scene = this.$('#scene');
    var $camera = this.$('#camera');
    
    var WW;
    function setWW() {
      WW = $window.width();
    }
    var WH = $window.height();
    function setWH() {
      WH = $window.height();
    }
    function setWWH() {
      setWW();
      setWH();

      $document.trigger('setwwh');
    }
    setWWH();
    $window.resize(setWWH);

    $.fn.domvertices.defaults.traceAppendEl = $scene;

    //
    // Camera view
    //

    true && (function () {
      this.cameraView = new CameraView({
        el: $camera,
        width: WW,
        height: WH
      });
      $.fn.domvertices.defaults.lastParent = $camera[0];
      window.camera = this.cameraView.camera;
      this.cameraView.moveAndLookAtElement($scene[0], {duration: 0});
      window.moveAndLookAtElement = this.cameraView.moveAndLookAtElement;

      var renderer = new THREE.CSS3DRenderer($scene[0], this.cameraView.el);
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

      function onsetwwh() {
        this.cameraView.camera.aspect = WW/WH;
        this.cameraView.camera.updateProjectionMatrix();

        renderer.setSize(WW, WH);
      }
      onsetwwh = onsetwwh.bind(this);
      onsetwwh();
      $document.on('setwwh', onsetwwh);

      function update() {
        this.cameraView.camera.updateProjectionMatrix();
      }
      update = update.bind(this);
      function draw() {
        this.cameraView.camera.updateProjectionMatrix();
        
        renderer.render(scene, this.cameraView.camera);
      }
      draw = draw.bind(this);
      window.draw = draw;
      draw();

      //
      // shading
      //

      var renderlight;
      var lightpos;
      (function () {
        // Determine the vendor prefixed transform property
        var transformProp = ["transform", "webkitTransform", "MozTransform", "msTransform"].filter(function (prop) {
            return prop in document.documentElement.style;
        })[0];


        // Default positions
        lightpos = {
          x: 0,
          y: 0,
          z: -1000
        };
        // Define the light source
        var $light = $(".light");
        var light = $light[0];
        

        /* Render
        ---------------------------------------------------------------- */

        renderlight = function () {
          light.style[transformProp] = "translateY(" + lightpos.y + "px) translateX(" + lightpos.x + "px) translateZ(" + lightpos.z + "px)";
          // Get the light position
          var lightVertices = $light.domvertices().data('v');
          var lightPosition = lightVertices.a;

          // Light each face
          [].slice.call(document.querySelectorAll(".stabilo .f, .stabilo .h, .cube .face")).forEach(function (face, i) {
            var $el = $(face);
            var vertices = $el.domvertices().data('v');

            var ac = new THREE.Vector3().subVectors(vertices.c, vertices.a);
            var ab = new THREE.Vector3().subVectors(vertices.b, vertices.a)

            var faceCenter = new THREE.Vector3().copy(ac).divideScalar(2);
            var faceNormal = new THREE.Vector3().copy(ab).cross(ac).normalize();

            var direction = new THREE.Vector3().subVectors(lightPosition, faceCenter).normalize();
            var amount = .5* (1 - Math.max(0, faceNormal.dot(direction)));

            if (!$el.data('orig-bgimg')) {
              $el.data('orig-bgimg', $el.css('background-image'));
            }
            face.style.backgroundImage = $el.data('orig-bgimg') + ", linear-gradient(rgba(0,0,0," + amount.toFixed(3) + "), rgba(0,0,0," + amount.toFixed(3) + "))";
          });
        }
      }).call(this);

      //
      // Render loop
      //

      var clock = new THREE.Clock();
      var renderLoop = new Loop(function (t, t0) {
        //update(clock.getDelta());
        draw();
        TWEEN.update(t);

        /*var l = $.fn.domvertices.v.length;
        while (l--) {
          $.fn.domvertices.v[l].update().trace();
        }*/

        //renderlight();
      });
      renderLoop.start();
      renderlight();

      // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object

      var activeMacbook;
      this.$('.macbook').on('click', function (e) {
        console.log('click');
      	var $mba = $(e.currentTarget);

        var css3dobject = $mba.data('css3dobject');

        if (activeMacbook !== $mba[0]) {
          activeMacbook = $mba[0];
          
          //new TWEEN.Tween(css3dobject.rotation).to({z: -3*Math.PI/180}, 300).start();
        
          this.cameraView.moveAndLookAtElement($mba.find('.display')[0]);

        } else {
          
          //new TWEEN.Tween(css3dobject.rotation).to({z: 3*Math.PI/180}, 300).start();

          this.cameraView.moveAndLookAtElement($scene[0]);

          activeMacbook = undefined;
        }
        
      }.bind(this));

      this.$('.sheets').on('click', function (e) {
        this.cameraView.moveAndLookAtElement($('#page-2')[0]);
      });

      //
      // dat.gui controls (debug)
      //

      (function () {
        var camera = this.cameraView.camera;
        
        if ($html.is('.debug')) {
          var dat = require('dat-gui');
          var gui = new dat.GUI();
          gui.close();

          var f1 = gui.addFolder('camera.position');
          var px = f1.add(camera.position, 'x', -1000, 1000);
          var py = f1.add(camera.position, 'y', -1000, 3000);
          var pz = f1.add(camera.position, 'z', -5000, 5000);

          var f2 = gui.addFolder('camera.rotation');
          var rx = f2.add(camera.rotation, 'x', 0, 2*Math.PI);
          var ry = f2.add(camera.rotation, 'y', 0, 2*Math.PI);
          var rz = f2.add(camera.rotation, 'z', 0, 2*Math.PI);

          var f4 = gui.addFolder('lightpos');
          f4.add(lightpos, 'x', -5000, 5000);
          f4.add(lightpos, 'y', -5000, 5000);
          f4.add(lightpos, 'z', -2000, 2000);
        }
      }).call(this);

    }).call(this);

    //
    // Scroller
    //

    var $scroller = this.$('.scroller');
    $('html, body').css('overflow', 'hidden');
    $scroller.each(function (i, el) {
      var ftscroller = new FTScroller(el, {
        bouncing: false,
        scrollbars: false,
        scrollingX: false,
        //contentHeight: undefined,
        updateOnWindowResize: true
      });
      ftscroller.addEventListener('scroll', function () {
        console.log('scroll', ftscroller.scrollTop);
      });
    });

  }
});

module.exports = HomeView;