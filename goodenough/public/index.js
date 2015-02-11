require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');
require('jquery-hammer');

var Stats = require('stats');

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

    true && (function () {
      var real = new Real({
        gravity: 0,
        debug: {
          enabled: $html.is('.debug'),
          appendEl: $camera
        }
      });
      this.real = real;
      window.real = this.real;
       
      this.scrollEl = real.addElement(new Real.Element($('.pages'), real));
       
      //
      // Friction joint
      //

      var frictionjoint = new Real.Friction(real, real.world.GetGroundBody(), real.findElement($('.pages')).body);

      //new Real.Prismatic(real, real.world.GetGroundBody(), real.findElement($('.pages')).body);

      //
      // MouseJoint
      //

      (function () {
        var body = this.scrollEl.body;

        var mouseJointDef = new b2MouseJointDef();
        mouseJointDef.bodyA = real.world.GetGroundBody();
        mouseJointDef.collideConnected = true;
        mouseJointDef.maxForce = 1000 * body.GetMass();
        //mouseJointDef.dampingRatio = 0;
        //mouseJointDef.frequencyHz = 99999;
         
        var mouseJoint;

        function project(mouse2d) {
          //
          // project mouse into 3d space
          //

          var camera = this.cameraView.camera;
          // http://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
          var mouse3d = new THREE.Vector3();
          mouse3d.set(
            -(mouse2d.x/WW)*2 + 1, // modified!
            -(mouse2d.y/WH)*2 + 1,
          0.5);
          mouse3d.unproject(camera);

          var dir = mouse3d.sub(camera.position).normalize();
          var distance = -camera.position.z/dir.z;

          var pos = camera.position.clone().add(dir.multiplyScalar(distance));

          var v = $camera.domvertices().data('v');
          mouse2d.Set(
            (pos.x - v.a.x)/real.SCALE,
            (pos.y - v.a.y)/real.SCALE
          );
        }

        //
        // Mouse + touch
        //

        (function () {
          var mouse = new b2Vec2();

          function setMouse(e) {
            e = ~e.type.indexOf('touch') && e.originalEvent && e.originalEvent.targetTouches && e.originalEvent.targetTouches[0] || e;
            
            mouse.Set(e.pageX, e.pageY);
            project(mouse);
          }
          function mousedown(e) {
            console.log('mousedown');
            setMouse(e);
           
            $(document.body).undelegate('.element', 'mousedown touchstart', mousedown);
            $(window).one('mouseup touchend', mouseup);
           
            mouseJointDef.target = mouse;
            mouseJointDef.bodyB = body;
            mouseJoint = real.world.CreateJoint(mouseJointDef);
            mouseJoint.SetTarget(mouse);
           
            $(document).on('mousemove touchmove', mousemove);
          }
          function mouseup(e) {
            console.log('mouseup');

            if (mouseJoint) {
              real.world.DestroyJoint(mouseJoint);
            }
            
            $(document).off('mousemove touchmove', mousemove);
            $(document.body).delegate('.element', 'mousedown touchstart', mousedown);
          }
          function mousemove(e) {
            console.log('mousemove');
            e.preventDefault(); // http://stackoverflow.com/questions/11204460/the-touchmove-event-on-android-system-transformer-prime
           
            setMouse(e);
            mouseJointDef.bodyB.SetAwake(true);
          }
          $(document.body).delegate('.element', 'mousedown touchstart', mousedown);

          // prevent scroll
          document.ontouchstart = function(e){ 
              e.preventDefault(); // http://stackoverflow.com/questions/2890361/disable-scrolling-in-an-iphone-web-application#answer-2890530
          }
        }).call(this);

        //
        // scrollwheel
        //

        (function () {
          $('html, body').css('overflow', 'hidden');

          // http://stackoverflow.com/questions/3515446/jquery-mousewheel-detecting-when-the-wheel-stops/28371047#28371047
          var wheelint;
          $window.on('mousewheel', _.throttle(function (e) {
            if (!wheelint) {
              console.log('start wheeling!');

            }

            clearTimeout(wheelint);
            wheelint = setTimeout(function() {
              console.log('stop wheeling!');
              wheelint = undefined;

            }, 250);

            var delta = {
              x: e.deltaFactor * e.deltaX,
              y: e.deltaFactor * e.deltaY
            };

            var impulse = new b2Vec2(-delta.x*50, delta.y*50);

            var impulseOrigin = new b2Vec2(e.pageX, e.pageY);
            project(impulseOrigin);

            body.ApplyImpulse(impulse, impulseOrigin);
          }, 0));
        }).call(this);

      }).call(this);

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

    // real
    var dt = t - t0;
    this.real.step(dt);
    this.real.draw();

    /*var l = $.fn.domvertices.v.length;
    while (l--) {
      $.fn.domvertices.v[l].update().trace();
    }*/

    //renderlight();
  }
});

module.exports = HomeView;
},{"./real":2,"./three.css3d.js":3,"backbone":"backbone","carouselview":"carouselview","dat-gui":"dat-gui","domvertices":"domvertices","ftscroller":"ftscroller","jquery":"jquery","jquery-domvertices":"jquery-domvertices","jquery-hammer":"jquery-hammer","jquery-mousewheel":"jquery-mousewheel","loop":"loop","stats":"stats","three":"three","tween":"tween","underscore":"underscore"}],2:[function(require,module,exports){
(function () {
  //
  // Real
  //

  var Box2D = require('box2dweb');
  var Loop = require('loop');
  var $ = require('jquery');
  var _ = require('underscore');
  var domvertices = require('domvertices');
  require('jquery-domvertices');
  var THREE = require('three');
  //var Stats = require('stats');
 
  (function ($) {
    "use strict";

    $.fn.offsetRelative = $.fn.offsetRelative || function (el) {
      var $el = $(el);

      var elOffset = this.offset();

      var $parent = this.parent().closest($el);
      if (!$parent.length) {
        return elOffset;
      }
      var parentOffset = $parent.offset();

      return {
        left: elOffset.left - parentOffset.left,
        top: elOffset.top - parentOffset.top
      };
    };
  }(jQuery));

  // Flatten Box2d (ugly but handy!)
  (function b2(o) {
    for (k in o) {
      if (o.hasOwnProperty(k)) {
        if ($.isPlainObject(o[k])) {
          b2(o[k]);
        } else if (/^b2/.test(k)) {
          window[k] = o[k];
        }
      }
    }
  }(Box2D));
   
  // Inheritance utility (see: http://coffeescript.org/#try:class%20A%0Aclass%20B%20extends%20A)
  function inherit(child, parent) {
    for (var key in parent) {
      if (parent.hasOwnProperty(key)) {
        child[key] = parent[key];
      }
    }
   
    function ctor() {this.constructor = child;}
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.uber = parent.prototype;
   
    return child;
  };
   
  //
  // TODO Shims (to add)
  //
  // Function.prototype.bind
  // Array.prototype.indexOf
   
   
  var SCALE;
  function Real(options) {
    options || (options = {});
   
    options = $.extend(true, {
      debug: false,
      gravity: 9.81,
      SCALE: 150
    }, options);
    
    this.SCALE = options.SCALE;
    SCALE = this.SCALE;

    this.clock = new Real.Timer();
    this.world = new b2World(
      new b2Vec2(0, options.gravity), // gravity
      true                            // allow sleep
    );
   
    this.loop = new Loop(this.loop.bind(this)/*, 1000/10*/);
    //this.drawLoop = new Loop(this.drawLoop.bind(this));
   
    this.elements = [];
   
    // debug
    this.debug = options.debug && options.debug.enabled;
    if (this.debug) {
      this.setDebugDraw(options.debug);
    }
   
    /*if (this.debug) {
      this.updatePerf = new Stats();
      $('body').append($(this.updatePerf.domElement).css({position: 'fixed', left:0, top:0}));
   
      this.drawPerf = new Stats();
      $('body').append($(this.drawPerf.domElement).css({position: 'fixed', left:80, top:0}));
    }*/
    
  }
  Real.prototype.setDebugDraw = function (options) {
    if ($('canvas.debugDraw').length > 0) return;
   
    var $window = $('html');
    var $append = $(options.appendEl) || $('body');

    var debugDraw = new b2DebugDraw();
    this.debugDraw = debugDraw;
    var $canvas = $('<canvas class="debugDraw" width="' + ($window.width()) + '" height="' + ($window.height()) + '"/>').css({
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      zIndex: -1
    }).appendTo($append);
    debugDraw.SetSprite($canvas.get(0).getContext("2d"));
    debugDraw.SetDrawScale(SCALE);
    debugDraw.SetFillAlpha(0.8);
    debugDraw.SetLineThickness(0.5);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit | b2DebugDraw.e_centerOfMassBit);
    this.world.SetDebugDraw(debugDraw);
  };
  Real.prototype.unsetDebugDraw = function () {
    real.world.SetDebugDraw(null);
    $('canvas.debugDraw').remove();
  };
  Real.prototype.step = function (dt) {
    //this.debug && this.updatePerf.begin();
   
    this.world.Step(
      dt / 1000, //frame-rate
      8,   //velocity iterations
      3    //position iterations
    );
   
    if (this.debug) {
      this.world.DrawDebugData();
    }
   
    var i = this.elements.length;
    while (i--) {
      this.elements[i].update();
    }
   
    //this.debug && this.updatePerf.end();
  };
  Real.prototype.draw = function (smooth) {
    //this.debug && this.drawPerf.begin();
   
    var i = this.elements.length;
    while (i--) {
      this.elements[i].draw(smooth);
    }
   
    //this.debug && this.drawPerf.end();
  };
  Real.prototype.start = function () {
    this.clock.start();
    this.loop.start();
    //this.drawLoop.start();
  };
  Real.prototype.loop = function () {
    // http://gafferongames.com/game-physics/fix-your-timestep/
    // http://www.koonsolo.com/news/dewitters-gameloop/
    // http://www.unagames.com/blog/daniele/2010/06/fixed-time-step-implementation-box2d
    // http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/
    // http://actionsnippet.com/swfs/qbox_FRIM.html
    // http://gamesfromwithin.com/casey-and-the-clearly-deterministic-contraptions
    
    this.clock.tick();
    while (this.clock.accumulator >= this.clock.dt) {
   
      //console.log('update');
      this.step(this.clock.dt);
      this.clock.subtick();
    }
    this.world.ClearForces();
    
    this.draw(true);
  };
  Real.prototype.stop = function () {
    this.loop.stop();
    this.clock.stop();
    //this.drawLoop.stop();
  };
  Real.prototype.addElement = function (element) {
    this.elements.push(element);
   
    return element;
  };
  Real.prototype.removeElement = function (element) {
    this.world.DestroyBody(this.elements[i].body);
    this.elements.splice(this.element.indexOf(element), 1);
  };
  Real.prototype.findElement = function (el) {
    var $el = $(el);
    el = $el[0];

    var i = this.elements.length;
    while (i--) {
      if (this.elements[i].el === el) {
        return this.elements[i];
      }
    }
  };
   
  function Timer() {
    this.t = 0;
    this.dt = 1000/60; // Max FPS
   
    this.currentTime = void 0;
    this.accumulator = void 0;
   
    this.dtMax = 1000/4; // Min FPS
  }
  Timer.prototype.start = function () {
    if (this.currentTime) {
      return;
    }
    this.currentTime = new Date().getTime();
    this.accumulator = 0;
   
    return this;
  };
  Timer.prototype.stop = function () {
    if (!this.currentTime) {
      return;
    }
    this.currentTime = void 0;
    this.accumulator = void 0;
   
    return this;
  };
  Timer.prototype.tick = function () {
    if (!this.currentTime) {
      throw "Timer not started!";
    }
    var newTime = new Date().getTime();
   
    var frameTime = newTime - this.currentTime;
    frameTime = Math.min(frameTime, this.dtMax);
   
    this.currentTime = newTime;
    
    this.accumulator += frameTime;
   
    return this;
  };
  Timer.prototype.subtick = function () {
    this.t           += this.dt;
    this.accumulator -= this.dt;
  };
  Real.Timer = Timer;
   
   
  function State() {
    this.set.apply(this, arguments);
  }
  State.prototype.set = function (x, y, a) {
    this.x = x;
    this.y = y;
    this.a = a;
   
    return this;
  };
   
  function Element(el, real, options) {
    options || (options = {});
   
    this.$el = $(el);
    this.el = this.$el[0];

    this.$el.data('real', this); // expando

    //var v = $el.domvertices().data('v');
   
    // Defaults
    options = $.extend(true, {
      body: {
        type: b2Body.b2_dynamicBody,
      },
      fixture: {
        density: 1,
        friction: 0,
        restitution: 0,
        shape: b2PolygonShape
      }
    }, options);
   
    this.$el.addClass('element');
   
    this.real = real;
   
    // Fixture
    var fixDef = new b2FixtureDef;
    fixDef.density = options.fixture.density;
    fixDef.friction = options.fixture.friction;
    fixDef.restitution = options.fixture.restitution;
    // Shape
    if (options.fixture.shape === b2PolygonShape) {
      fixDef.shape = new b2PolygonShape;
      fixDef.shape.SetAsBox(
        this.$el.outerWidth() / 2 / SCALE, //half width
        this.$el.outerHeight() / 2 / SCALE  //half height
      );
    } else {
      fixDef.shape = new b2CircleShape(this.$el.outerWidth() / 2 / SCALE);
    }
   
    // Body
    var $relative = $('#scene');
    var bodyDef = new b2BodyDef;
    bodyDef.type = options.body.type;
    this.origPos = {
      left: this.$el.offsetRelative($relative).left,
      top: this.$el.offsetRelative($relative).top,
      width: this.$el.outerWidth(),
      height: this.$el.outerHeight()
    };
    bodyDef.position.x = (this.origPos.left + this.origPos.width / 2) / SCALE;
    bodyDef.position.y = (this.origPos.top + this.origPos.height / 2) / SCALE;
    bodyDef.fixedRotation = true;
   
    // Add to world
    this.body = real.world.CreateBody(bodyDef);
    this.body.CreateFixture(fixDef);
   
    var pos = this.body.GetPosition();
    var ang = this.body.GetAngle();
    this.state = new State(pos.x, pos.y, ang);
  }
  Element.prototype.update = function () {
    var pos = this.body.GetPosition();
    var ang = this.body.GetAngle();
   
    var x = pos.x;
    var y = pos.y;
    var a = ang;
   
    this.previousState = this.state; // backup previous state
    this.state = new State(x, y, a);
  };
  Element.prototype.draw = function (smooth) {
    if (this.body.GetType() === b2Body.b2_staticBody) {
      return;
    }
   
    var state;
   
    // Interpolate with previous state
    if (false && smooth && this.previousState) {
      /*var accumulator = this.real.clock.accumulator/1000

      var v = this.body.GetLinearVelocity();
      var w = this.body.GetAngularVelocity();

      x += v.x * accumulator;
      y += v.y * accumulator;
      a += w * accumulator;*/
   
      var fixedTimestepAccumulatorRatio = this.real.clock.accumulator / this.real.clock.dt;
      var oneMinusRatio = 1 - fixedTimestepAccumulatorRatio;
   
      var x = this.state.x * fixedTimestepAccumulatorRatio + oneMinusRatio * this.previousState.x;
      var y = this.state.y * fixedTimestepAccumulatorRatio + oneMinusRatio * this.previousState.y;
      var a = this.state.a * fixedTimestepAccumulatorRatio + oneMinusRatio * this.previousState.a;
   
      state = new State(x, y, a);
    } else {
      state = this.state;
    }
   
    var origPos = this.origPos;
   
    this.$el.css('transform', 'translate3d(' + ~~(state.x*SCALE - origPos.left  - origPos.width / 2) + 'px, ' + ~~(state.y*SCALE - origPos.top - origPos.height / 2) + 'px, 0) rotate3d(0,0,1,' + (state.a * 180 / Math.PI) + 'deg)');
    //this.el.style.webkitTransform = 'translate3d(' + ~~(state.x*SCALE - origPos.left  - origPos.width / 2) + 'px, ' + ~~(state.y*SCALE - origPos.top - origPos.height / 2) + 'px, 0) rotate3d(0,0,1,' + ~~(state.a * 180 / Math.PI) + 'deg)';
  };
  Real.Element = Element;
   
  /*function Spring(real, bodyA, bodyB, options) {
    if (!bodyA || !bodyB) {
      return;
    }
   
    var springDef;
    springDef = new b2DistanceJointDef();
    springDef.bodyA = bodyA;
    springDef.bodyB = bodyB;
    springDef.localAnchorA = springDef.bodyA.GetLocalCenter();
    springDef.localAnchorB = springDef.bodyB.GetLocalCenter();
    springDef.collideConnected = true;
    //springDef.dampingRatio = .2;
    //springDef.frequencyHz = .5
    springDef.length = (function () {
      var v = springDef.bodyB.GetWorldPoint(springDef.localAnchorB);
      v.Subtract(springDef.bodyA.GetWorldPoint(springDef.localAnchorA))
      return v.Length();
    }());
   
    return real.world.CreateJoint(springDef);
  };
  Real.Spring = Spring;*/

  function Friction(real, bodyA, bodyB, options) {
    if (!bodyA || !bodyB) {
      return;
    }

    options || (options = {});
    _.defaults(options, {
      maxForce: 30*bodyB.GetMass()
    });

    var frictionJointDef = new b2FrictionJointDef();
    frictionJointDef.localAnchorA.SetZero();
    frictionJointDef.localAnchorB.SetZero();
    //frictionJointDef.collideConnected = true;
    frictionJointDef.maxForce = options.maxForce;
    frictionJointDef.bodyA = bodyA;
    frictionJointDef.bodyB = bodyB;
   
    return real.world.CreateJoint(frictionJointDef);
  };
  Real.Friction = Friction;

  function Prismatic(real, bodyA, bodyB, options) {
    if (!bodyA || !bodyB) {
      return;
    }

    options || (options = {});
    _.defaults(options, {
    });

    //
    // Prismatic (http://www.iforce2d.net/b2dtut/joints-prismatic)
    //

    var prismaticJointDef = new b2PrismaticJointDef();
    prismaticJointDef.bodyA = bodyA;
    prismaticJointDef.bodyB = bodyB;
    prismaticJointDef.localAxisA.Set(0,1);
    prismaticJointDef.localAxisA.Normalize();
    prismaticJointDef.localAnchorA = bodyB.GetPosition();
    prismaticJointDef.localAnchorB.SetZero();
    //prismaticJointDef.collideConnected = true;
    //prismaticJointDef.enableLimit = true;
    //prismaticJointDef.lowerTranslation = -($body.outerHeight() - $window.outerHeight()) / SCALE;
    //prismaticJointDef.upperTranslation = $window.outerHeight() / SCALE;

    return real.world.CreateJoint(prismaticJointDef);
  };
  Real.Prismatic = Prismatic;
  

  // Exports
  this.Real = Real;
  if (typeof module !== "undefined" && module !== null) {
    module.exports = this.Real;
  }
 
}).call(this);
},{"box2dweb":"box2dweb","domvertices":"domvertices","jquery":"jquery","jquery-domvertices":"jquery-domvertices","loop":"loop","three":"three","underscore":"underscore"}],3:[function(require,module,exports){
var THREE = require('three');
var $ = require('jquery');

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
      /*$(object.element).parentsUntil('#camera').each(function (i,el) {
        var _t = $(el).css('transform');
        if (_t !== 'none') {
          t.push(_t);
        }
      });*/
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
},{"jquery":"jquery","three":"three"}],"Goodenough":[function(require,module,exports){
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
