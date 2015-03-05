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

    var v = $el.domvertices();

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
    $.fn.domvertices.defaults.root = $camera[0];
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
    var lightVertices = this.$light.domvertices();
    var lightPosition = lightVertices.a;

    // Light each face
    [].slice.call(document.querySelectorAll(".stabilo .f, .stabilo .h, .cube .face")).forEach(function (face, i) {
      var $el = $(face);
      var vertices = $el.domvertices();

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

    $.fn.domvertices.defaults.append = $scene;

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

      this.$pages = $('.pages');
       
      this.scrollEl = real.addElement(new Real.Element(this.$pages, real));
       
      //
      // Friction joint
      //

      var frictionjoint = new Real.Friction(real, real.world.GetGroundBody(), real.findElement(this.$pages).body);

      //new Real.Prismatic(real, real.world.GetGroundBody(), real.findElement($('.pages')).body);

      //
      // MouseJoint
      //

      (function () {
        var body = this.scrollEl.body;

        var mouseJointDef = new b2MouseJointDef();
        mouseJointDef.bodyA = real.world.GetGroundBody();
        mouseJointDef.collideConnected = true;
        mouseJointDef.maxForce = 10000000000000000000 * body.GetMass();
        mouseJointDef.dampingRatio = 0;
        mouseJointDef.frequencyHz = 99999;
         
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

          var v = $camera.domvertices();
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
            //console.log('mousedown');
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
            //console.log('mouseup');

            if (mouseJoint) {
              real.world.DestroyJoint(mouseJoint);
            }
            
            $(document).off('mousemove touchmove', mousemove);
            $(document.body).delegate('.element', 'mousedown touchstart', mousedown);
          }
          function mousemove(e) {
            //console.log('mousemove');
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

            var FACTOR = 100;
            var impulse = new b2Vec2(-delta.x*FACTOR, delta.y*FACTOR);

            var impulseOrigin = new b2Vec2(e.pageX, e.pageY);
            project(impulseOrigin);

            body.ApplyImpulse(impulse, impulseOrigin);
          }, 0));
        }).call(this);

      }).call(this);

      //
      // bondage
      //

      var WEAKHZ = 6;
      var STRONGHZ = 8;

      function Bondage(real, root, el) {
        this.real = real;

        // $el is attached to $root
        this.$root = $(root);
        this.$el = $(el);
      }
      Bondage.prototype.attach = function (snap) {
        var $snap = $(snap);

        if (snap) {
          this.$snap = $snap;
        }

        var v = $snap.domvertices({root: this.$el[0]});

        var first = 0/10;
        var second = 10/10;

        // Top springs
        // var e1 = new THREE.Vector3().subVectors(v.b, v.a).multiplyScalar(first).add(v.a);
        // this.springTop1 = this.createSpring({x: first*WW, y: 0}, {x: e1.x, y: e1.y});
        // var e2 = new THREE.Vector3().subVectors(v.b, v.a).multiplyScalar(second).add(v.a);
        // this.springTop2 = this.createSpring({x: second*WW, y: 0}, {x: e2.x, y: e2.y});

        // Left springs
        var h1 = new THREE.Vector3().subVectors(v.d, v.a).multiplyScalar(first).add(v.a);
        this.springLeft1 = this.createSpring({x: 0, y: first*WH}, {x: h1.x, y: h1.y});
        var h2 = new THREE.Vector3().subVectors(v.d, v.a).multiplyScalar(second).add(v.a);
        this.springLeft2 = this.createSpring({x: 0, y: second*WH}, {x: h2.x, y: h2.y});

        // Right springs
        var f1 = new THREE.Vector3().subVectors(v.c, v.b).multiplyScalar(first).add(v.b);
        this.springRight1 = this.createSpring({x: WW, y: first*WH}, {x: f1.x, y: f1.y});
        var f2 = new THREE.Vector3().subVectors(v.c, v.b).multiplyScalar(second).add(v.b);
        this.springRight2 = this.createSpring({x: WW, y: second*WH}, {x: f2.x, y: f2.y});

        /*var springBottom = (function () {
          var v = this.$pages.data('v') || this.$pages.domvertices();
          var h = new THREE.Vector3().subVectors(v.d, v.a).length();

          return this.createSpring({x: WW/2, y: WH}, {x: WW/2, y: h});
        }).call(this);*/

      };
      Bondage.prototype.detach = function () {

      };
      Bondage.prototype.b2localcoordinates = function (domcoordinates, el) {
        var $el = $(el);

        var v = $el.data('v') || $el.domvertices();

        var w = new THREE.Vector3().subVectors(v.b, v.a).length();
        var h = new THREE.Vector3().subVectors(v.d, v.a).length();

        return (new b2Vec2(
          domcoordinates.x - w/2,
          domcoordinates.y - h/2
        ));
      };
      Bondage.prototype.createSpring = function (anchor1, anchor2) {
        var springDef = new b2DistanceJointDef();
        springDef.bodyA = this.real.world.GetGroundBody();
        springDef.bodyB = this.$el.data('real').body;
        springDef.localAnchorA = new b2Vec2(
          anchor1.x / real.SCALE,
          anchor1.y / real.SCALE
        );
        var anchor2local = this.b2localcoordinates(anchor2, this.$el);
        springDef.localAnchorB = new b2Vec2(
          anchor2local.x / real.SCALE,
          anchor2local.y / real.SCALE
        );
        springDef.dampingRatio = 1;
        springDef.frequencyHz = WEAKHZ; // Spring is created soft: important for darken
        springDef.length = 0;
       
        return this.real.world.CreateJoint(springDef);
      };
      Bondage.prototype.shift = function () {
        //var t = this.$pages.data('real').transform;
        //var tx = t && t.x || 0;
        //var ty = t && t.y || 0;

        function y(A, B) {
          var a = (B.y - A.y)/(B.x - A.x + 0.0000001); // slope

          return function (x) {
            return a*x + (A.y - a*A.x);
          };
        }
        function x(A, B) {
          var a = (B.y - A.y)/(B.x - A.x + 0.0000001); // slope

          return function (y) {
            return (y - (A.y - a*A.x)) / a;
          };
        }

        var v = this.$el.domvertices({root: this.$root[0]});   // #pages vertices in #camera coordinates
        var vv = this.$snap.domvertices({root: this.$el[0]}); // closest vertices in #pages coordinates
        var vvv = this.$snap.domvertices({root: this.$root[0]}); // closest vertices in #camera coordinates

        var width = new THREE.Vector3().subVectors(v.b, v.a).length();
        var height = new THREE.Vector3().subVectors(v.d, v.a).length();

        //
        // top spring
        //

        // var e1 = new THREE.Vector3(this.springTop1.m_localAnchor1.x*this.real.SCALE, this.springTop1.m_localAnchor1.y*this.real.SCALE, 0);
        // e1 = e1.applyMatrix4(new THREE.Matrix4().getInverse(v.matrix)); // e in #pages coordinates
        // //console.log(e.x, e.y);
        // var e1x = e1.x;
        // e1x = Math.max(e1x, vv.a.x) // x >= xA
        // e1x = Math.min(e1x, vv.b.x) // x <= xB
        // var anchor2local = this.b2localcoordinates({
        //   x: e1x,
        //   y: y(vv.a, vv.b)(e1x)
        // }, this.$el);
        // this.springTop1.m_localAnchor2.x = anchor2local.x/this.real.SCALE;
        // this.springTop1.m_localAnchor2.y = anchor2local.y/this.real.SCALE;
        // if (vvv.a.y - this.springTop1.m_localAnchor1.y <= 0) {
        //   this.springTop1.m_frequencyHz = 0.001;
        //   console.log('weak top spring 1');
        // } else {
        //   this.springTop1.m_frequencyHz = WEAKHZ;
        //   console.log('normal top spring 1');
        // }

        // var e2 = new THREE.Vector3(this.springTop2.m_localAnchor1.x*this.real.SCALE, this.springTop2.m_localAnchor1.y*this.real.SCALE, 0);
        // e2 = e2.applyMatrix4(new THREE.Matrix4().getInverse(v.matrix)); // e in #pages coordinates
        // //console.log(e.x, e.y);
        // var e2x = e2.x;
        // e2x = Math.max(e2x, vv.a.x) // x >= xA
        // e2x = Math.min(e2x, vv.b.x) // x <= xB
        // var anchor2local = this.b2localcoordinates({
        //   x: e2x,
        //   y: y(vv.a, vv.b)(e2x)
        // }, this.$el);
        // this.springTop2.m_localAnchor2.x = anchor2local.x/this.real.SCALE;
        // this.springTop2.m_localAnchor2.y = anchor2local.y/this.real.SCALE;
        // if (vvv.b.y - this.springTop2.m_localAnchor1.y <= 0) {
        //   this.springTop2.m_frequencyHz = 0.001;
        //   console.log('weak top spring 2');
        // } else {
        //   this.springTop2.m_frequencyHz = WEAKHZ;
        //   console.log('normal top spring 2');
        // }

        var m = new THREE.Matrix4().getInverse(vvv.matrix);
        var m2 = vv.matrix;

        //
        // left spring
        //

        var h1 = new THREE.Vector3(this.springLeft1.m_localAnchor1.x*this.real.SCALE, this.springLeft1.m_localAnchor1.y*this.real.SCALE, 0);
        h1 = h1.applyMatrix4(m); // h in #pages coordinates
        h1 = new THREE.Vector3(0, h1.y, 0);
        h1 = h1.applyMatrix4(m2);
        h1y = h1.y;
        h1y = Math.max(h1y, vv.a.y) // y >= yA
        h1y = Math.min(h1y, vv.d.y) // y <= yD
        var anchor2local = this.b2localcoordinates({
          x: x(vv.a, vv.d)(h1y),
          y: h1y
        }, this.$el);
        this.springLeft1.m_localAnchor2.x = anchor2local.x/this.real.SCALE;
        this.springLeft1.m_localAnchor2.y = anchor2local.y/this.real.SCALE;
        // if (vvv.a.x - this.springLeft1.m_localAnchor1.x <= 0) {
        //   this.springLeft1.m_frequencyHz = 0.001;
        //   console.log('weak left spring 1');
        // } else {
        //   this.springLeft1.m_frequencyHz = WEAKHZ;
        //   console.log('normal left spring 1');
        // }

        var h2 = new THREE.Vector3(this.springLeft2.m_localAnchor1.x*this.real.SCALE, this.springLeft2.m_localAnchor1.y*this.real.SCALE, 0);
        h2 = h2.applyMatrix4(m); // h in #pages coordinates
        h2 = new THREE.Vector3(0, h2.y, 0);
        h2 = h2.applyMatrix4(m2);
        var h2y = h2.y;
        h2y = Math.max(h2y, vv.a.y) // y >= yA
        h2y = Math.min(h2y, vv.d.y) // y <= yD
        var anchor2local = this.b2localcoordinates({
          x: x(vv.a, vv.d)(h2y),
          y: h2y
        }, this.$el);
        this.springLeft2.m_localAnchor2.x = anchor2local.x/this.real.SCALE;
        this.springLeft2.m_localAnchor2.y = anchor2local.y/this.real.SCALE;
        // if (vvv.d.x - this.springLeft2.m_localAnchor1.x <= 0) {
        //   this.springLeft2.m_frequencyHz = 0.001;
        //   console.log('weak left spring 2');
        // } else {
        //   this.springLeft2.m_frequencyHz = WEAKHZ;
        //   console.log('normal left spring 2');
        // }

        //
        // right spring
        //

        var f1 = new THREE.Vector3(this.springRight1.m_localAnchor1.x*this.real.SCALE, this.springRight1.m_localAnchor1.y*this.real.SCALE, 0);
        f1 = f1.applyMatrix4(m); // h in #pages coordinates
        f1 = new THREE.Vector3(new THREE.Vector3().subVectors(vv.b, vv.a).length(), f1.y, 0);
        f1 = f1.applyMatrix4(m2);
        var f1y = f1.y;
        f1y = Math.max(f1y, vv.b.y) // y >= yB
        f1y = Math.min(f1y, vv.c.y) // y <= yC
        var anchor2local = this.b2localcoordinates({
          x: x(vv.b, vv.c)(f1y),
          y: f1y
        }, this.$el);
        this.springRight1.m_localAnchor2.x = anchor2local.x/this.real.SCALE;
        this.springRight1.m_localAnchor2.y = anchor2local.y/this.real.SCALE;
        // if (vvv.b.x - this.springRight1.m_localAnchor1.x <= 0) {
        //   this.springRight1.m_frequencyHz = 0.001;
        // } else {
        //   this.springRight1.m_frequencyHz = WEAKHZ;
        // }

        var f2 = new THREE.Vector3(this.springRight2.m_localAnchor1.x*this.real.SCALE, this.springRight2.m_localAnchor1.y*this.real.SCALE, 0);
        f2 = f2.applyMatrix4(m); // h in #pages coordinates
        f2 = new THREE.Vector3(new THREE.Vector3().subVectors(vv.b, vv.a).length(), f2.y, 0);
        f2 = f2.applyMatrix4(m2);
        var f2y = f2.y;
        f2y = Math.max(f2y, vv.b.y) // y >= yB
        f2y = Math.min(f2y, vv.c.y) // y <= yC
        var anchor2local = this.b2localcoordinates({
          x: x(vv.b, vv.c)(f2y),
          y: f2y
        }, this.$el);
        this.springRight2.m_localAnchor2.x = anchor2local.x/this.real.SCALE;
        this.springRight2.m_localAnchor2.y = anchor2local.y/this.real.SCALE;
        // if (vvv.c.x - this.springRight2.m_localAnchor1.x <= 0) {
        //   this.springRight2.m_frequencyHz = 0.001;
        // } else {
        //   this.springRight2.m_frequencyHz = WEAKHZ;
        // }
      };

      (function () {

        

        function findClosest($els, point) {
          // TODO
          return $els.eq(0);
        }

        var $snap = this.$('.page');
        var $closest = findClosest($snap, {x: 0, y: 0});
        // Compute t, r, b, l anchors points
        /*$snap.each(function (i, el) {
          var $el = $(el);

          var v = $el.domvertices();

          var t = new THREE.Vector3().subVectors(v.b, v.a).divideScalar(2);
          var r = new THREE.Vector3().subVectors(v.c, v.b).divideScalar(2);
          var b = new THREE.Vector3().subVectors(v.c, v.d).divideScalar(2);
          var l = new THREE.Vector3().subVectors(v.d, v.a).divideScalar(2);
          var m = new THREE.Vector3().subVectors(v.c, v.a).divideScalar(2);

          var w = new THREE.Vector3().subVectors(v.b, v.a).length();
          var h = new THREE.Vector3().subVectors(v.d, v.a).length();

          var minx = Math.min.apply(Math, [v.a.x, v.b.x, v.c.x, v.d.x]);
          var maxx = Math.max.apply(Math, [v.a.x, v.b.x, v.c.x, v.d.x]);
          var miny = Math.min.apply(Math, [v.a.y, v.b.y, v.c.y, v.d.y]);
          var maxy = Math.max.apply(Math, [v.a.y, v.b.y, v.c.y, v.d.y]);

          $el.data('anchor', {
            t: t,
            r: r,
            b: b,
            l: l,
            m: m,
            bbox: {
              a: {x: minx, y: miny},
              b: {x: maxx, y: miny},
              c: {x: maxx, y: maxy},
              d: {x: minx, y: maxy}
            },
            w: w,
            h: h
          });
        });*/

        this.bondage = new Bondage(real, $camera, this.$pages);
        this.bondage.attach($closest);

        //var state = this.$pages.data('real').state;
        //state.on('change', );

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

    this.bondage.shift();

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