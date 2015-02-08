var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');
require('jquery-hammer');

var THREE = require('three'); window.THREE = THREE;
require('./three.css3d.js');

var Real = require('./real');

require('jquery-mousewheel');

var FTScroller = require('ftscroller');

var CarouselView = require('carouselview');

var domvertices = require('domvertices');
require('jquery-domvertices');

var Loop = require('loop');

var TWEEN = require('tween');
window.TWEEN = TWEEN;

var $window = $(window);
var $document = $(document);
var $html = $('html');
var $body = $('body');

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

var CameraView = Backbone.View.extend({
  initialize: function (options) {
    this.options = options;

    this.camera = new THREE.PerspectiveCamera(30, options.width/options.height, -1000, 1000);

    this.$target = undefined;

    this.moveAndLookAt = this.moveAndLookAt.bind(this);
    this.moveAndLookAtElement = this.moveAndLookAtElement.bind(this);
    this.recenter = this.recenter.bind(this);
  },
  panTo: function (dstpos, options) {
    var camera = this.camera;

    options || (options = {});
    _.defaults(options, {
      duration: 300
    });

    //
    // Tweening
    //

    // position
    new TWEEN.Tween(camera.position).to({
      x: dstpos.x,
      y: dstpos.y,
      z: dstpos.z
    }, options.duration).start();
  },
  panBy: function (vec, options) {
    var camera = this.camera;

    options || (options = {});
    _.defaults(options, {
      duration: 300
    });

    var dstpos = new THREE.Vector3().copy(camera.position).add(vec);

    this.panTo(dstpos, options);
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

    this.panTo(dstpos, options);

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
    var $el = $(el);
    el = $el[0];

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

    var v = $el.domvertices().data('v');

    var ac = new THREE.Vector3().subVectors(v.c, v.a);
    var ab = new THREE.Vector3().subVectors(v.b, v.a);
    var ad = new THREE.Vector3().subVectors(v.d, v.a);

    var faceCenter = new THREE.Vector3().copy(ac).divideScalar(2)
    //console.log('faceCenter', faceCenter);
    var faceNormal = new THREE.Vector3().copy(ab).cross(ac).normalize();
    //console.log('faceNormal', faceNormal);

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

    this.moveAndLookAt(dstpos, dstlookat, {
      duration: options.duration,
      up: new THREE.Vector3().copy(ad).negate()
    });

    this.$target = $el;
  },
  recenter: function () {
    if (this.$target && this.$target.length) {
      this.moveAndLookAtElement(this.$target, {duration: 0});
    }

    return this;
  }
});

var SceneView = Backbone.View.extend({
  initialize: function (options) {
    this.options = options;

    var $scene = this.$el;
    var $camera = this.$el.children(':first');

    this.update = this.update.bind(this);
    this.draw = this.draw.bind(this);
    this.renderlight = this.renderlight.bind(this);

    this.cameraView = new CameraView({
      el: $camera,
      width: WW,
      height: WH
    });
    $.fn.domvertices.defaults.lastParent = $camera[0];
    window.cameraView = this.cameraView;
    this.cameraView.moveAndLookAtElement($scene[0], {duration: 0});

    this.renderer = new THREE.CSS3DRenderer($scene[0], this.cameraView.el);
    window.renderer = this.renderer;
    //renderer.domElement.style.position = 'absolute';

    this.scene = new THREE.Scene();
    window.scene = this.scene;

    $('.obj').each(function (i, el) {
      var $el = $(el);

      var obj = new THREE.CSS3DObject(el);
      $el.data('css3dobject', obj);

      //var offset = $el.offset();
      //obj.position.set(offset.left,offset.top,0);

      console.log('obj', obj.getWorldPosition());
      this.scene.add(obj);
    }.bind(this));

    function onsetwwh(first) {
      this.cameraView.camera.aspect = WW/WH;
      this.cameraView.camera.updateProjectionMatrix();
      if (first !== true) {this.cameraView.recenter();} // do NOT recenter the first-time

      this.renderer.setSize(WW, WH);
    }
    onsetwwh = onsetwwh.bind(this);
    onsetwwh(true);
    $document.on('setwwh', onsetwwh);

    
    this.draw();

    //
    // shading
    //

    // Define the light source
    this.$light = $(".light");
    this.light = this.$light[0];

    this.lightposModel = new (Backbone.Model.extend())({
      x: 0,
      y: 0,
      z: -1000
    });
    window.lightposModel = this.lightposModel;
    this.lightposModel.on('change', this.renderlight);
  },
  update: function () {
    this.cameraView.camera.updateProjectionMatrix();
  },
  draw: function () {
    this.cameraView.camera.updateProjectionMatrix();
    
    this.renderer.render(this.scene, this.cameraView.camera);
  },
  renderlight: function () {
    console.log('renderlight');

    // Determine the vendor prefixed transform property
    var transformProp = ["transform", "webkitTransform", "MozTransform", "msTransform"].filter(function (prop) {
      return prop in document.documentElement.style;
    })[0];

    this.light.style[transformProp] = "translateY(" + this.lightposModel.get('y') + "px) translateX(" + this.lightposModel.get('x') + "px) translateZ(" + this.lightposModel.get('z') + "px)";
    // Get the light position
    var lightVertices = this.$light.domvertices().data('v');
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
});

var HomeView = Backbone.View.extend({
  initialize: function (options) {
    this.options = options;

    //console.log('homeView');

    var $scene = this.$('#scene');
    var $camera = this.$('#camera');

    $.fn.domvertices.defaults.traceAppendEl = $scene;

    //
    // Box2D
    //

    (function () {
      var real = new Real({
        gravity: 0,
        debug: {
          enabled: $html.is('.debug'),
          appendEl: $camera
        }
      });
      window.real = real;
       
      real.addElement(new Real.Element($('.pages'), real));
       
      //
      // MouseJoint
      //
      
      var mouse = new b2Vec2();
      window.mouse = mouse;
      var mouseJointDef = new b2MouseJointDef();
      mouseJointDef.target = mouse;
      mouseJointDef.bodyA = real.world.GetGroundBody();
      mouseJointDef.collideConnected = true;
       
      var mouseJoint;

      function setMouse(e) {
        e = ~e.type.indexOf('touch') && e.originalEvent && e.originalEvent.targetTouches && e.originalEvent.targetTouches[0] || e;
        
        var v = $camera.domvertices().data('v');
        mouse.Set(
          (e.pageX - v.a.x)/real.SCALE,
          (e.pageY - v.a.y)/real.SCALE
        );
      }
      function mousedown(e) {
        setMouse(e);
       
        $(document.body).undelegate('.element', 'mousedown touchstart', mousedown);
        $(window).one('mouseup touchend', mouseup);
       
        var element = real.findElement(this);
        var body = element && element.body;
       
        mouseJointDef.bodyB = body;
        mouseJointDef.maxForce = 100 * body.GetMass();
       
        mouseJoint = real.world.CreateJoint(mouseJointDef);
        mouseJoint.SetTarget(mouse);
       
        $(document).on('mousemove touchmove', mousemove);
      }
      function mouseup(e) {
        if (mouseJoint) {
          real.world.DestroyJoint(mouseJoint);
        }
        
        $(document.body).delegate('.element', 'mousedown touchstart', mousedown);
        $(window).off('mousemove touchmove', mousemove);
      }
      function mousemove(e) {
        e.preventDefault(); // http://stackoverflow.com/questions/11204460/the-touchmove-event-on-android-system-transformer-prime
       
        setMouse(e);
        mouseJointDef.bodyB.SetAwake(true);
      }
      $(document.body).delegate('.element', 'mousedown touchstart', mousedown);
      
      //
      // Friction joint
      //

      console.log('toto');
      //new Real.Friction(real, real.world.GetGroundBody(), real.findElement($('.pages')).body);

      // 
      real.start();
     
      /*if (window.DeviceMotionEvent) {
        real.world.m_allowSleep = false;
        function ondevicemotion(e) {
          real.world.SetGravity(new b2Vec2(-e.accelerationIncludingGravity.x, e.accelerationIncludingGravity.y));
        }
        window.addEventListener('devicemotion', ondevicemotion, false);
      }*/
     
      // prevent scroll
      document.ontouchstart = function(e){ 
          e.preventDefault(); // http://stackoverflow.com/questions/2890361/disable-scrolling-in-an-iphone-web-application#answer-2890530
      }


    }).call(this);

    //
    // Camera view
    //

    true && (function () {
      
      this.sceneView = new SceneView({el: $scene});

      //
      // Render loop
      //

      this.renderloop = this.renderloop.bind(this);

      //var clock = new THREE.Clock();
      var renderLoop = new Loop(this.renderloop);
      renderLoop.start();
      this.sceneView.renderlight();

      // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object

      var activeMacbook;
      this.$('.macbook').hammer().on('tap', function (e) {
        console.log('click');
      	var $mba = $(e.currentTarget);

        var css3dobject = $mba.data('css3dobject');

        if (activeMacbook !== $mba[0]) {
          activeMacbook = $mba[0];
          
          //new TWEEN.Tween(css3dobject.rotation).to({z: -3*Math.PI/180}, 300).start();
        
          this.sceneView.cameraView.moveAndLookAtElement($mba.find('.display')[0]);

        } else {
          
          //new TWEEN.Tween(css3dobject.rotation).to({z: 3*Math.PI/180}, 300).start();

          this.sceneView.cameraView.moveAndLookAtElement($scene[0]);

          activeMacbook = undefined;
        }
        
      }.bind(this));

      this.$('.sheets').on('click', function (e) {
        this.cameraView.moveAndLookAtElement($('#page-2')[0]);
      }.bind(this));

      //
      // dat.gui controls (debug)
      //

      (function () {
        var camera = this.sceneView.cameraView.camera;
        
        if ($html.is('.debug')) {
          var dat = require('dat-gui');
          var gui = new dat.GUI();
          gui.close();

          var f1 = gui.addFolder('camera.position');
          var px = f1.add(camera.position, 'x', -1000, 1000);
          var py = f1.add(camera.position, 'y', -1000, 3000);
          var pz = f1.add(camera.position, 'z', -5000, 15000);

          var f2 = gui.addFolder('camera.rotation');
          var rx = f2.add(camera.rotation, 'x', 0, 2*Math.PI);
          var ry = f2.add(camera.rotation, 'y', 0, 2*Math.PI);
          var rz = f2.add(camera.rotation, 'z', 0, 2*Math.PI);

          var f4 = gui.addFolder('lightposModel');
          var lightpos = {
            x: lightposModel.get('x'),
            y: lightposModel.get('y'),
            z: lightposModel.get('z')
          };
          var lx = f4.add(lightpos, 'x', -5000, 5000);
          var ly = f4.add(lightpos, 'y', -5000, 5000);
          var lz = f4.add(lightpos, 'z', -2000, 2000);
          lx.onChange(function(val) {
            lightposModel.set({x: val});
          });
          ly.onChange(function(val) {
            lightposModel.set({y: val})
          });
          lz.onChange(function(val) {
            lightposModel.set({z: val})
          });

        }
      }).call(this);

    }).call(this);

    //
    // Scroller
    //

    /*var $scroller = this.$('.scroller');
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
    });*/

  },
  renderloop: function (t, t0) {
    //update(clock.getDelta());
    this.sceneView.draw();
    TWEEN.update(t);

    /*var l = $.fn.domvertices.v.length;
    while (l--) {
      $.fn.domvertices.v[l].update().trace();
    }*/

    //renderlight();
  }
});

module.exports = HomeView;