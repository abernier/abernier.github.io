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
  var Stats = require('stats');
 
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
   
    if (this.debug) {
      this.updatePerf = new Stats();
      $('body').append($(this.updatePerf.domElement).css({position: 'fixed', left:0, top:0}));
   
      this.drawPerf = new Stats();
      $('body').append($(this.drawPerf.domElement).css({position: 'fixed', left:80, top:0}));
    }
    
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
    this.debug && this.updatePerf.begin();
   
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
   
    this.debug && this.updatePerf.end();
  };
  Real.prototype.draw = function (smooth) {
    this.debug && this.drawPerf.begin();
   
    var i = this.elements.length;
    while (i--) {
      this.elements[i].draw(smooth);
    }
   
    this.debug && this.drawPerf.end();
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