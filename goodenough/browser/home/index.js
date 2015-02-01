var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');

require('jquery-waypoints');
require('jquery-waypoints-sticky');
require('jquery-hammer');
require('velocity-animate');

var FTScroller = require('ftscroller');

var CarouselView = require('carouselview');

function computeVertexData(el) {
  function parseMatrix (matrixString) {
    var c = matrixString.split(/\s*[(),]\s*/).slice(1,-1);
    var matrix;

    if (c.length === 6) {
        // 'matrix()' (3x2)
        matrix = new THREE.Matrix4().set(
          c[0],  +c[2], 0, +c[4],
          +c[1], +c[3], 0, +c[5],
          0,     0,     1, 0,
          0,     0,     0, 1
        );
    } else if (c.length === 16) {
        // matrix3d() (4x4)
        matrix = new THREE.Matrix4().set(
            +c[0], +c[4], +c[8],  +c[12],
            +c[1], +c[5], +c[9],  +c[13],
            +c[2], +c[6], +c[10], +c[14],
            +c[3], +c[7], +c[11], +c[15]
        );

    } else {
        // handle 'none' or invalid values.
        matrix = new THREE.Matrix4().identity();
    }
    
    return matrix;
  }

  var w = el.offsetWidth;
  var h = el.offsetHeight;
  var v = {
      a: new THREE.Vector3().set(0, 0, 0), // top left corner
      b: new THREE.Vector3().set(w, 0, 0), // top right corner
      c: new THREE.Vector3().set(w, h, 0), // bottom right corner
      d: new THREE.Vector3().set(0, h, 0)  // bottom left corner
  };  
  //console.log(v);

  var elem = el;

  var matrices = [];
  while (elem.nodeType === 1) {(function () {
    var computedStyle = getComputedStyle(elem, null);

    //
    // P(0->1) : position (ie: translation)
    //

    var P01;
    (function () {
      var x = 0;
      var y = 0;
      var parent = elem.parentNode;
      if (parent && parent.nodeType === 1) {
        var parentComputedStyle = getComputedStyle(parent, null);

        var offsetLeft = elem.offsetLeft;
        var offsetTop = elem.offsetTop;
        if (parentComputedStyle.position === 'static') {
          offsetLeft -= parent.offsetLeft;
          offsetTop -= parent.offsetTop;
        }
        x = offsetLeft - elem.scrollLeft + elem.clientLeft;
        y = offsetTop - elem.scrollTop + elem.clientTop;
      }

      /*P01 = new THREE.Matrix4().set(
        1, 0, x, 0,
        0, 1, y, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      );*/
      P01 = new THREE.Matrix4().makeTranslation(x, y, 0);
    }).call(this);

    //
    // P(1->2) : transform-origin (ie: translation)
    //

    var P12;
    (function () {
      var transformOrigin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || computedStyle.MozTransformOrigin || computedStyle.msTransformOrigin;
      transformOrigin = transformOrigin.split(' ');
      var x = parseFloat(transformOrigin[0], 10);
      var y = parseFloat(transformOrigin[1], 10);

      /*P12 = new THREE.Matrix4().set(
        1, 0, x, 0,
        0, 1, y, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      );*/
      P12 = new THREE.Matrix4().makeTranslation(x, y, 0);
    }).call(this);

    //
    // P(2->3) : transform
    //

    var P23;
    (function () {
      var transform = computedStyle.transform || computedStyle.webkitTransform || computedStyle.MozTransform || computedStyle.msTransform;
      
      P23 = parseMatrix(transform);
    }).call(this);

    //
    // P(0->3) = P(0->1) . P(1->2) . P(2->3)
    //

    //console.log(P01.elements);
    //console.log(P12.elements);
    //console.log(P23.elements);

    var P10 = new THREE.Matrix4().getInverse(P01);
    var P21 = new THREE.Matrix4().getInverse(P12);
    var P32 = new THREE.Matrix4().getInverse(P23);

    //console.log(P10.elements);
    //console.log(P21.elements);
    //console.log(P32.elements);

    var P03 = new THREE.Matrix4().identity();
    /*P03.multiply(P01);
    P03.multiply(P12);
    P03.multiply(P23);*/
    P03.multiply(P01);
    P03.multiply(P12);
    P03.multiply(P23);
    P03.multiply(P21);

    //var P30 = new THREE.Matrix4().getInverse(P03);
    //var P30 = P03;

    matrices.push(P03);

    elem = elem.parentNode;
  }())}

  matrices.forEach(function (m) {
    v.a = v.a.applyMatrix4(m);
    v.b = v.b.applyMatrix4(m);
    v.c = v.c.applyMatrix4(m);
    v.d = v.d.applyMatrix4(m);
  });

  return v;
}

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

var HomeView = Backbone.View.extend({
  initialize: function (options) {
    this.options = options;

    console.log('homeView');

    var $scene = this.$('#scene');
    var $camera = this.$('#camera');
    var $window = $(window);
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

      function moveAndLookAt(camera, dstpos, dstlookat, options) {
        options || (options = {});
        _.defaults(options, {duration: 300});

        var origpos = new THREE.Vector3().copy(camera.position); // original position
        var origrot = new THREE.Euler().copy(camera.rotation); // original rotation

        camera.position.set(dstpos.x, dstpos.y, dstpos.z);
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
      }
      function moveAndLookAtElement(camera, el, options) {
        options || (options = {});
        _.defaults(options, {
          duration: 300,
          distance: undefined,
          distanceTolerance: 0/100
        });

        var v = computeVertexData(el);
        /*for (k in v) {
          $('<b>').css({
            display:'block',width:'0px',height:'0px', boxShadow:'0 0 0 1px lime',
            position:'absolute',left:'0px',top:'0px', transform:'translate3d(' + v[k].x + 'px,' + v[k].y + 'px, ' + v[k].z + 'px)'
          }).appendTo('#scene'); // !important so <b> is subjected to perspective
        }*/

        var ac = new THREE.Vector3().subVectors(v.c, v.a);
        var ab = new THREE.Vector3().subVectors(v.b, v.a);

        var faceCenter = new THREE.Vector3().copy(ac).divideScalar(2)
        console.log('faceCenter', faceCenter);
        var faceNormal = new THREE.Vector3().copy(ab).cross(ac).normalize();
        console.log('faceNormal', faceNormal);

        //
        // Auto-distance (to fit width/height)
        //

        if (typeof options.distance === 'undefined' || options.distance === null) {
          var ad = new THREE.Vector3().subVectors(v.d, v.a);

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
        moveAndLookAt(camera, dstpos, dstlookat, options);
      }

      var camera = new THREE.PerspectiveCamera(30, WW/WH, -1000, 1000);
      window.camera = camera;


      var lookAt = new THREE.Vector3(WW/2,WH/2,1);
      camera.up.set(0, -1, 0);
      camera.position.set(WW/2, WH/2, distw(WW, camera.fov, camera.aspect)); // camera.position.z === -perspective
      
      window.lookAt = lookAt;
      camera.lookAt(lookAt);
      /*moveAndLookAt(
        camera,
        new THREE.Vector3(WW/2, WH/2, distw(WW, camera.fov, camera.aspect)),
        lookAt,
        {duration: 0}
      );*/

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

      //
      // shading
      //

      var renderlight;
      var lightpos;
      (function () {
        /* Returns the rotation and translation components of an element
        ---------------------------------------------------------------- */

        function getTransform (elem) {
            var computedStyle = getComputedStyle(elem, null),
                val = computedStyle.transform ||
                    computedStyle.webkitTransform ||
                    computedStyle.MozTransform ||
                    computedStyle.msTransform,
                matrix = parseMatrix(val),
                rotateY = Math.asin(-matrix.m13),
                rotateX, 
                rotateZ;

                rotateX = Math.atan2(matrix.m23, matrix.m33);
                rotateZ = Math.atan2(matrix.m12, matrix.m11);

            /*if (Math.cos(rotateY) !== 0) {
                rotateX = Math.atan2(matrix.m23, matrix.m33);
                rotateZ = Math.atan2(matrix.m12, matrix.m11);
            } else {
                rotateX = Math.atan2(-matrix.m31, matrix.m22);
                rotateZ = 0;
            }*/

            return {
                transformStyle: val,
                matrix: matrix,
                rotate: {
                    x: rotateX,
                    y: rotateY,
                    z: rotateZ
                },
                translate: {
                    x: matrix.m41,
                    y: matrix.m42,
                    z: matrix.m43
                }
            };
        }


        /* Parses a matrix string and returns a 4x4 matrix
        ---------------------------------------------------------------- */

        function parseMatrix (matrixString) {
            var c = matrixString.split(/\s*[(),]\s*/).slice(1,-1),
                matrix;

            if (c.length === 6) {
                // 'matrix()' (3x2)
                matrix = {
                    m11: +c[0], m21: +c[2], m31: 0, m41: +c[4],
                    m12: +c[1], m22: +c[3], m32: 0, m42: +c[5],
                    m13: 0,     m23: 0,     m33: 1, m43: 0,
                    m14: 0,     m24: 0,     m34: 0, m44: 1
                };
            } else if (c.length === 16) {
                // matrix3d() (4x4)
                matrix = {
                    m11: +c[0], m21: +c[4], m31: +c[8], m41: +c[12],
                    m12: +c[1], m22: +c[5], m32: +c[9], m42: +c[13],
                    m13: +c[2], m23: +c[6], m33: +c[10], m43: +c[14],
                    m14: +c[3], m24: +c[7], m34: +c[11], m44: +c[15]
                };

            } else {
                // handle 'none' or invalid values.
                matrix = {
                    m11: 1, m21: 0, m31: 0, m41: 0,
                    m12: 0, m22: 1, m32: 0, m42: 0,
                    m13: 0, m23: 0, m33: 1, m43: 0,
                    m14: 0, m24: 0, m34: 0, m44: 1
                };
            }
            return matrix;
        }

        /* Adds vector v2 to vector v1
        ---------------------------------------------------------------- */

        function addVectors (v1, v2) {
            return {
                x: v1.x + v2.x,
                y: v1.y + v2.y,
                z: v1.z + v2.z
            };
        }


        /* Rotates vector v1 around vector v2
        ---------------------------------------------------------------- */

        function rotateVector (v1, v2) {
            var x1 = v1.x,
                y1 = v1.y,
                z1 = v1.z,
                angleX = v2.x / 2,
                angleY = v2.y / 2,
                angleZ = v2.z / 2,

                cr = Math.cos(angleX),
                cp = Math.cos(angleY),
                cy = Math.cos(angleZ),
                sr = Math.sin(angleX),
                sp = Math.sin(angleY),
                sy = Math.sin(angleZ),

                w = cr * cp * cy + -sr * sp * -sy,
                x = sr * cp * cy - -cr * sp * -sy,
                y = cr * sp * cy + sr * cp * sy,
                z = cr * cp * sy - -sr * sp * -cy,

                m0 = 1 - 2 * ( y * y + z * z ),
                m1 = 2 * (x * y + z * w),
                m2 = 2 * (x * z - y * w),

                m4 = 2 * ( x * y - z * w ),
                m5 = 1 - 2 * ( x * x + z * z ),
                m6 = 2 * (z * y + x * w ),

                m8 = 2 * ( x * z + y * w ),
                m9 = 2 * ( y * z - x * w ),
                m10 = 1 - 2 * ( x * x + y * y );

            return {
                x: x1 * m0 + y1 * m4 + z1 * m8,
                y: x1 * m1 + y1 * m5 + z1 * m9,
                z: x1 * m2 + y1 * m6 + z1 * m10
            };
        }

        /* Vector functions
        -------------------------------------------------- */

        var Vect3 = {
            create: function(x, y, z) {
                return {x: x || 0, y: y || 0, z: z || 0};
            },
            add: function(v1, v2) {
                return {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z};
            },
            sub: function(v1, v2) {
                return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z};
            },
            mul: function(v1, v2) {
                return {x: v1.x * v2.x, y: v1.y * v2.y, z: v1.z * v2.z};
            },
            div: function(v1, v2) {
                return {x: v1.x / v2.x, y: v1.y / v2.y, z: v1.z / v2.z};
            },
            muls: function(v, s) {
                return {x: v.x * s, y: v.y * s, z: v.z * s};
            },
            divs: function(v, s) {
                return {x: v.x / s, y: v.y / s, z: v.z / s};
            },
            len: function(v) {
                return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            },
            dot: function(v1, v2) {
                return (v1.x * v2.x) + (v1.y * v2.y) + (v1.z * v2.z);
            },
            cross: function(v1, v2) {
                return {x: v1.y * v2.z - v1.z * v2.y, y: v1.z * v2.x - v1.x * v2.z, z: v1.x * v2.y - v1.y * v2.x};
            },
            normalize: function(v) {
                return Vect3.divs(v, Vect3.len(v));
            },
            ang: function(v1, v2) {
                return Math.acos(Vect3.dot(v1, v2) / (Vect3.len(v1) * Vect3.len(v2)));
            },
            copy: function(v) {
                return {x: v.x, y: v.y, z: v.z};
            },
            equal: function(v1,v2) {
                return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
            },
            rotate: function(v1, v2) {
                var x1 = v1.x,
                    y1 = v1.y,
                    z1 = v1.z,
                    angleX = v2.x / 2,
                    angleY = v2.y / 2,
                    angleZ = v2.z / 2,

                    cr = Math.cos(angleX),
                    cp = Math.cos(angleY),
                    cy = Math.cos(angleZ),
                    sr = Math.sin(angleX),
                    sp = Math.sin(angleY),
                    sy = Math.sin(angleZ),

                    w = cr * cp * cy + -sr * sp * sy,
                    x = sr * cp * cy - -cr * sp * sy,
                    y = cr * sp * cy + sr * cp * -sy,
                    z = cr * cp * sy - -sr * sp * cy,

                    m0 = 1 - 2 * ( y * y + z * z ),
                    m1 = 2 * (x * y + z * w),
                    m2 = 2 * (x * z - y * w),

                    m4 = 2 * ( x * y - z * w ),
                    m5 = 1 - 2 * ( x * x + z * z ),
                    m6 = 2 * (z * y + x * w ),

                    m8 = 2 * ( x * z + y * w ),
                    m9 = 2 * ( y * z - x * w ),
                    m10 = 1 - 2 * ( x * x + y * y );

                return {
                    x: x1 * m0 + y1 * m4 + z1 * m8,
                    y: x1 * m1 + y1 * m5 + z1 * m9,
                    z: x1 * m2 + y1 * m6 + z1 * m10
                };
            }
        };

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
        var light = document.querySelector(".light");
        

        /* Render
        ---------------------------------------------------------------- */

        console.log('toto');
        renderlight = function () {
          light.style[transformProp] = "translateY(" + lightpos.y + "px) translateX(" + lightpos.x + "px) translateZ(" + lightpos.z + "px)";
          // Get the light position
          var lightVertices = computeVertexData(light)
          var lightPosition = lightVertices.a;

          /*var $el = $(light);
          for (var k in lightVertices) { //
            var verticeEl = $el.data('vertice-'+k);
            if (!verticeEl) {
              var $b = $('<b>').css({
                display:'block', width:'0px', height:'0px', boxShadow:'0 0 0 1px red',
                position:'absolute', left:'0px', top:'0px', transform:'translate3d(' + lightVertices[k].x + 'px,' + lightVertices[k].y + 'px, ' + lightVertices[k].z + 'px)'
              }).appendTo('#scene');

              $el.data('vertice-'+k, $b[0]);
            } else {
              $(verticeEl).css('transform', 'translate3d(' + lightVertices[k].x + 'px,' + lightVertices[k].y + 'px, ' + lightVertices[k].z + 'px)');
            }
          }*/

          // Light each face
          [].slice.call(document.querySelectorAll(".stabilo .f, .stabilo .h, .cube .face")).forEach(function (face, i) {
            var $el = $(face);
            var vertices = computeVertexData(face);

            /*for (var k in vertices) { //
              var verticeEl = $el.data('vertice-'+k);
              if (!verticeEl) {
                var $b = $('<b>').css({
                  display:'block', width:'0px', height:'0px', boxShadow:'0 0 0 1px lime',
                  position:'absolute', left:'0px', top:'0px', transform:'translate3d(' + vertices[k].x + 'px,' + vertices[k].y + 'px, ' + vertices[k].z + 'px)'
                }).appendTo('#scene');

                $el.data('vertice-'+k, $b[0]);
              } else {
                $(verticeEl).css('transform', 'translate3d(' + vertices[k].x + 'px,' + vertices[k].y + 'px, ' + vertices[k].z + 'px)');
              }
            }*/
            
            var ac = Vect3.sub(vertices.c, vertices.a);
            var ab = Vect3.sub(vertices.b, vertices.a)

            var faceCenter = Vect3.divs(ac, 2);
            var faceNormal = Vect3.normalize(Vect3.cross(ab, ac));

            /*var normalEl = $el.data('normal');
            if (!normalEl) {
              var $b = $('<i>').css({
                display:'block', width:'0px', height:'0px', boxShadow:'0 0 0 1px red',
                position:'absolute', left:'0px', top:'0px', transform:'translate3d(' + Vect3.add(vertices.a, faceCenter).x + 'px,' + Vect3.add(vertices.a, faceCenter).y + 'px, ' + Vect3.add(vertices.a, faceCenter).z + 'px)'
              }).appendTo('#scene');

              $el.data('normal', $b[0]);
            } else {
              $(normalEl).css('transform', 'translate3d(' + Vect3.add(vertices.a, faceCenter).x + 'px,' + Vect3.add(vertices.a, faceCenter).y + 'px, ' + Vect3.add(vertices.a, faceCenter).z + 'px)');
            }*/

            var direction = Vect3.normalize(Vect3.sub(lightPosition, faceCenter));
            //var direction = Vect3.sub(lightPosition, faceCenter);
            var amount = .5* (1 - Math.max(0, Vect3.dot(faceNormal, direction)));

            if (!$el.data('orig-bgimg')) {
              $el.data('orig-bgimg', $el.css('background-image'));
            }
            face.style.backgroundImage = $el.data('orig-bgimg') + ", linear-gradient(rgba(0,0,0," + amount.toFixed(3) + "), rgba(0,0,0," + amount.toFixed(3) + "))";
          });
        }
      }).call(this);

      var clock = new THREE.Clock();
      var renderLoop = new Loop(function (t, t0) {
        //update(clock.getDelta());
        draw();
        TWEEN.update(t);
        //renderlight();
        
        /*var l = faces.length;
        while (l--) {
          faces[l].render(light, true, true);
        }*/
      });
      renderLoop.start();
      renderlight();

      var dat = require('dat-gui');
      var gui = new dat.GUI();
      var f1 = gui.addFolder('camera.position');
      var px = f1.add(camera.position, 'x', -1000, 1000);
      var py = f1.add(camera.position, 'y', -1000, 3000);
      var pz = f1.add(camera.position, 'z', -5000, 5000);
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

      var f4 = gui.addFolder('lightpos');
      f4.add(lightpos, 'x', -5000, 5000);
      f4.add(lightpos, 'y', -5000, 5000);
      f4.add(lightpos, 'z', -2000, 2000);

      // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object

      var activeMacbook;
      this.$('.macbook').on('click', function (e) {
        console.log('click');
      	var $mba = $(this);

        var css3dobject = $mba.data('css3dobject');

        if (activeMacbook !== $mba[0]) {
          activeMacbook = $mba[0];
          
          //new TWEEN.Tween(css3dobject.rotation).to({z: -3*Math.PI/180}, 300).start();
        
          var theta = 60*Math.PI/180;
          var d = -disth(WH*Math.cos(theta), camera.fov, camera.aspect);
          moveAndLookAtElement(camera, $mba.find('.display')[0]);

        } else {
          
          //new TWEEN.Tween(css3dobject.rotation).to({z: 3*Math.PI/180}, 300).start();

          moveAndLookAt(
            camera,
            new THREE.Vector3(WW/2, WH/2, distw(WW, camera.fov, camera.aspect)),
            new THREE.Vector3(WW/2, WH/2, 0)
          );

          activeMacbook = undefined;
        }
        
      });

      this.$('.sheets').on('click', function (e) {
        moveAndLookAtElement(camera, $('#page-2')[0]);
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