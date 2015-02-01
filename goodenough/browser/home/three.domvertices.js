(function () {
  var THREE = this.THREE || require('three');

  //
  // Normalize 4x4 matrix from string, ie: 'matrix()' or 'matrix3d()' or 'none'
  //
  function normalizeMatrix (matrixString) {
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

  function domvertices(el) {
    //
    // a                b
    //  +--------------+
    //  |              |
    //  |      el      |
    //  |              |
    //  +--------------+
    // d                c
    //
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    var v = {
        a: new THREE.Vector3().set(0, 0, 0), // top left corner
        b: new THREE.Vector3().set(w, 0, 0), // top right corner
        c: new THREE.Vector3().set(w, h, 0), // bottom right corner
        d: new THREE.Vector3().set(0, h, 0)  // bottom left corner
    };

    //
    // Walk the DOM up, and extract 
    //

    var matrices = [];
    while (el.nodeType === 1) {(function () {
      var computedStyle = getComputedStyle(el, null);

      //
      // P(0->1) : relative position (to parent)
      //
      var P01;
      (function () {
        var x = 0;
        var y = 0;
        var parent = el.parentNode;
        if (parent && parent.nodeType === 1) {
          var parentComputedStyle = getComputedStyle(parent, null);

          var offsetLeft = el.offsetLeft;
          var offsetTop = el.offsetTop;
          if (parentComputedStyle.position === 'static') {
            offsetLeft -= parent.offsetLeft;
            offsetTop -= parent.offsetTop;
          }
          x = offsetLeft - el.scrollLeft + el.clientLeft;
          y = offsetTop - el.scrollTop + el.clientTop;
        }

        P01 = new THREE.Matrix4().makeTranslation(x, y, 0);
      }).call(this);

      //
      // P(1->2) : transform-origin
      //
      var P12;
      (function () {
        var transformOrigin = computedStyle.transformOrigin || computedStyle.webkitTransformOrigin || computedStyle.MozTransformOrigin || computedStyle.msTransformOrigin;
        transformOrigin = transformOrigin.split(' ');
        var x = parseFloat(transformOrigin[0], 10);
        var y = parseFloat(transformOrigin[1], 10);

        P12 = new THREE.Matrix4().makeTranslation(x, y, 0);
      }).call(this);

      //
      // P(2->3) : transform
      //
      var P23;
      (function () {
        var transform = computedStyle.transform || computedStyle.webkitTransform || computedStyle.MozTransform || computedStyle.msTransform;
        
        P23 = normalizeMatrix(transform);
      }).call(this);

      //
      // P(0->3) = P(0->1) . P(1->2) . P(2->3)
      //
      var P21 = new THREE.Matrix4().getInverse(P12);

      var P03 = new THREE.Matrix4().identity();
      P03.multiply(P01); // (1): translate position
      P03.multiply(P12); // (2): translate transform-origin
      P03.multiply(P23); // (3): transform
      P03.multiply(P21); // (4): inverse of (2)

      matrices.push(P03);

      el = el.parentNode;
    }())}

    //
    // apply changes of basis (in reverse order)
    //

    for (var i=0; i<matrices.length; i++) {
      v.a = v.a.applyMatrix4(matrices[i]);
      v.b = v.b.applyMatrix4(matrices[i]);
      v.c = v.c.applyMatrix4(matrices[i]);
      v.d = v.d.applyMatrix4(matrices[i]);
    }

    return v;
  }

  // Exports
  this.domvertices = domvertices;
  if (typeof module !== "undefined" && module !== null) {
    module.exports = this.domvertices;
  }
}).call(this);