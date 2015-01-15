var stylus = require('stylus');
var nib = require('nib');

var str = require('fs').readFileSync(__dirname + '/../index.styl', 'utf8');

stylus(str)
  .set('include css', true)
  .include(__dirname + '/..')
  .include(nib.path)
  .include(__dirname + '/../../public')
  //.define('url', require('../lib/stylus-url')())
  .render(function (err, css) {
    if (err) throw err;

    console.log(css);
  })