var _ = require('underscore');
var Backbone = require('backbone');
var Loop = require('loop');


function AnimationCanvas(options) {
	_.defaults(options, {
		// required
		canvasEl: undefined,    															  // canvas dom element
		imgsrc: undefined,     											 					  // sprite src
		w: (function () {return +options.canvasEl.getAttribute('width') || undefined;}()),    // canvas width
		h: (function () {return +options.canvasEl.getAttribute('height') || undefined;}()),   // canvas height
		totalFrames: undefined, 															  // number of frames within the sprite
		// optional (defaults)
		fps: 30,																			  // FPS
		autostart: true,         															  // auto-start on initialization
		count: 1,  																			  // number of times to play the animation
    postponestart: false
	});
	this.options = options;

  this.imgloaded = false;

	// Make events available
	_.extend(this, Backbone.Events);

	// context
	this.ctx = this.options.canvasEl.getContext('2d');

	// loop
	this.loop = new Loop(this.animloop.bind(this));

	// load sprite
	this.img = new Image();
	this.img.onload = function (e) {
    this.imgloaded = true;

    console.log('animationcanvas img loaded');
		this.trigger('load'); // trigger a 'load' event to report the image is ready

		if (this.options.autostart) {
			this.start();
		}
	}.bind(this);
	this.img.src = this.options.imgsrc;
}
AnimationCanvas.prototype.stop = function() {
	this.loop.stop();

	return this;
}
AnimationCanvas.prototype.start = function (duration) {
  console.log('start');

  // If we start before the img is loaded
  if (this.imgloaded !== true) {
    if (this.options.postponestart) {
      this.on('load', this.start); //delayed the start when img will be loaded
    }

    return true;
  }

	this.setStartFinish();

	this.loop.start();

	return this;
}
AnimationCanvas.prototype.setStartFinish = function () {
	var duration = this.options.totalFrames / this.options.fps * 1000;

	this.startedAt = (new Date).getTime();
	this.finishAt = this.startedAt + duration;

	return this;
};
AnimationCanvas.prototype.animloop = function(time) {
	// position normalized between [0, 1]
	var duration = this.finishAt - this.startedAt,
      pos = time > this.finishAt ? 1 : (time - this.startedAt) / (duration);

    if (pos >= 1) {
    	this.trigger('end');
    	
    	// 
    	if (this.options.count > 1) {
    		this.setStartFinish();
    		this.options.count--;
    	} else {
    		return false; // STOP loop !!!
    	}
    }

    this.drawFrame(pos);
}
AnimationCanvas.prototype.drawFrame = function(pos) {
	var num = Math.round(pos * (this.options.totalFrames-1));
  console.log(num);

	var offsetX = num * this.options.w % this.img.width;
    var offsetY = Math.floor(num * this.options.w / this.img.width) * this.options.h;
    
    this.ctx.clearRect(0, 0, this.options.w, this.options.h);
	this.ctx.drawImage(this.img, offsetX, offsetY, this.options.w, this.options.h, 0, 0, this.options.w, this.options.h);
}

this.AnimationCanvas = AnimationCanvas;
if (typeof module !== "undefined" && module !== null) {
  module.exports = this.AnimationCanvas;
}