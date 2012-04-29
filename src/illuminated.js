(function(cp){

  /**
   * Light: interface of a light
   * @arg position
   * @arg distance: the radius max distance the light emit color
   */
  cp.Light = function (position, distance) { this.position = position; this.distance = distance }
  /**
   * Render the light
   */
  cp.Light.prototype.render = function (ctx) {}

  /**
   * Render a mask representing the visibility
   * used by DarkMask
   */
  cp.Light.prototype.mask = function (ctx) {
    var c = this._getVisibleMaskCache();
    ctx.drawImage(c.canvas, Math.round(this.position.x-c.w/2), Math.round(this.position.y-c.h/2));
  }
  /**
   * Return a { topleft, bottomright } (outside are not impacted by the light)
   * By default use the distance
   */
  cp.Light.prototype.bounds = function () {
    return {
      topleft: new cp.Vec2(this.position.x-this.distance, this.position.y-this.distance),
      bottomright: new cp.Vec2(this.position.x+this.distance, this.position.y+this.distance)
    }
  }
  
  /**
   * Return the center of the light = the position where the light intensity is the highest
   */
  cp.Light.prototype.center = function () {
    return new cp.Vec2( this.distance, this.distance );
  }

  // Implement it by spreading samples and calling f at each time
  cp.Light.prototype.forEachSample = function (f) { f(this.position); }

  cp.Light.prototype._getVisibleMaskCache = function () {
    // By default use a radial gradient based on the distance
    var d = Math.floor(this.distance*1.4);
    var hash = ""+d;
    if (this.vismaskhash != hash) {
      this.vismaskhash = hash;
      var c = this.vismaskcache = createCanvasAnd2dContext(2*d, 2*d);
      var g = c.ctx.createRadialGradient(d, d, 0, d, d, d);
      g.addColorStop( 0, 'rgba(0,0,0,1)' );
      g.addColorStop( 1, 'rgba(0,0,0,0)' );
      c.ctx.fillStyle = g;
      c.ctx.fillRect(0, 0, c.w, c.h);
    }
    return this.vismaskcache;
  }


  /**
   * OpaqueObject: interface of an opaque object
   */
  cp.OpaqueObject = function () {}
  cp.OpaqueObject.prototype.cast = function (ctx, origin, bounds) { }
  cp.OpaqueObject.prototype.path = function (ctx) { }
  cp.OpaqueObject.prototype.bounds = function () { return { topleft: new cp.Vec2(), bottomright: new cp.Vec2() } }
  cp.OpaqueObject.prototype.contains = function (point) { return false }


  // LIGHTS

  /**
   * Lamp - Create a circular light.
   * @arg color: the color emited by the light
   * @arg radius: the radius size of the light
   * @arg samples: the number of light points which will be used for shadow projection (points are placed on the radius circle)
   */
  cp.Lamp = function (position, distance, color, radius, samples) {
    this.position = position;
    this.distance = position;
    this.color = color || 'rgba(250,230,200,0.5)';
    this.distance = distance || 100;
    this.radius = radius || 0;
    this.samples = samples || 1;
  }

  inherit(cp.Lamp, cp.Light);

  cp.Lamp.prototype._getHashCache = function () {
    return [this.color, this.distance].toString();
  }

  cp.Lamp.prototype._getGradientCache = function (center) {
    var hashcode = this._getHashCache();
    if (this.cacheHashcode == hashcode) {
      return this.gradientCache;
    }
    this.cacheHashcode = hashcode;
    var d = Math.round(this.distance);
    var D = d*2;
    var cache = createCanvasAnd2dContext(D, D);
    var g = cache.ctx.createRadialGradient(center.x, center.y, 0, d, d, d);
    g.addColorStop( 0, this.color );
    g.addColorStop( 1, 'rgba(0,0,0,0)' );
    cache.ctx.fillStyle = g;
    cache.ctx.fillRect(0, 0, cache.w, cache.h);
    return this.gradientCache = cache;
  }

  cp.Lamp.prototype.render = function (ctx) {
    var center = this.center();
    var c = this._getGradientCache(center);
    ctx.drawImage(c.canvas, Math.round(this.position.x-center.x), Math.round(this.position.y-center.y))
  }

  cp.Lamp.prototype.forEachSample = function (f) {
    // "spiral" algorithm for spreading emit samples
    for (var s=0; s<this.samples; ++s) {
      var a = s * GOLDEN_ANGLE;
      var r = Math.sqrt(s/this.samples)*this.radius;
      var delta = new cp.Vec2( Math.cos(a)*r, Math.sin(a)*r );
      f( this.position.add(delta) );
    }
  }

  /**
   * Hemi : an oriented lamp
   * @arg angle: the angle where the hemi point
   * @arg roughness: the roughness of the hemi
   */
  cp.Hemi = function (position, distance, color, radius, samples, angle, roughness) {
    this.__super.constructor.apply(this, arguments);
    this.angle = angle || 0;
    this.roughness = roughness || 0.8;
  }
  inherit(cp.Hemi, cp.Lamp);

  cp.Hemi.prototype._getHashCache = function () {
    return [this.color, this.distance, this.angle, this.roughness].toString();
  }
  cp.Hemi.prototype.center = function () {
    return new cp.Vec2( (1-Math.cos(this.angle)*this.roughness)*this.distance, (1+Math.sin(this.angle)*this.roughness)*this.distance );
  }


  /**
   * Spot
   * TODO
   */
  /*
  cp.Spot = function (position, distance) {
    this.position = position;
    this.distance = position;
  }
  inherit(cp.Spot, cp.Light);
  */

  /**
   * Neon
   * TODO
   */
  /*
  cp.Neon = function (position, distance, color, size, samples, angle) {
    this.position = position;
    this.distance = distance;
    this.color = color;
    this.size = size || 10;
    this.samples = samples || 2;
    this.angle = angle || 0;
  }
  inherit(cp.Neon, cp.Light);

  // TODO .center() and .bound()

  cp.Neon.prototype.render = function (ctx) {
    var center = this.center();
    var c = this._getGradientCache(center);
    ctx.drawImage(c.canvas, Math.round(this.position.x-center.x), Math.round(this.position.y-center.y))
  }

  cp.Neon.prototype._getHashCache = function () {
    return [this.color, this.distance, this.angle].toString();
  }

  cp.Neon.prototype._getGradientCache = function (center) {
    var hashcode = this._getHashCache();
    if (this.cacheHashcode == hashcode) {
      return this.gradientCache;
    }
    this.cacheHashcode = hashcode;
    var d = Math.round(this.distance);
    var D = d*2;
    var cache = createCanvasAnd2dContext(D, D);
    var g = cache.ctx.createRadialGradient(center.x, center.y, 0, d, d, d);
    g.addColorStop( 0, this.color );
    g.addColorStop( 1, 'rgba(0,0,0,0)' );
    cache.ctx.fillStyle = g;
    cache.ctx.fillRect(0, 0, cache.w, cache.h);
    return this.gradientCache = cache;
  }
  */

  /**
   * OrientedNeon: Neon with one side
   * TODO
   */
  /*
  cp.OrientedNeon = function (position, distance) {
    this.position = position;
    this.distance = position;
  }
  inherit(cp.OrientedNeon, cp.Light);
  */

  // OBJECTS

  cp.DiscObject = function (center, radius) {
    this.center = center;
    this.radius = radius;
  }
  inherit(cp.DiscObject, cp.OpaqueObject);

  cp.DiscObject.prototype.cast = function (ctx, origin, bounds) {
    // FIXME: the current method is wrong... TODO must see http://en.wikipedia.org/wiki/Tangent_lines_to_circles
    var m = this.center;
    var originToM = m.sub(origin);

    var d = new cp.Vec2(originToM.y, -originToM.x).normalize().mul(this.radius);
    
    var a = this.center.add(d);
    var b = this.center.add(d.inv());

    var originToA = a.sub(origin);
    var originToB = b.sub(origin);

    // normalize to distance
    var distance = ((bounds.bottomright.x-bounds.topleft.x)+(bounds.bottomright.y-bounds.topleft.y))/2;
    originToM = originToM.normalize().mul(distance);
    originToA = originToA.normalize().mul(distance);
    originToB = originToB.normalize().mul(distance);
    
    // project points
    var oam = a.add(originToM);
    var obm = b.add(originToM);
    var ap = a.add(originToA);
    var bp = b.add(originToB);

    var start = Math.atan2(originToM.x, -originToM.y);
    ctx.beginPath();
    path(ctx, [b, bp, obm, oam, ap, a], true);
    ctx.arc(m.x, m.y, this.radius, start, start+Math.PI);
    ctx.fill();
  }

  cp.DiscObject.prototype.path = function (ctx) {
    ctx.arc(this.center.x, this.center.y, this.radius, 0, _2PI);
  }
  
  cp.DiscObject.prototype.bounds = function () { 
    return { 
      topleft: new cp.Vec2(this.center.x-this.radius, this.center.y-this.radius),
      bottomright: new cp.Vec2(this.center.x+this.radius, this.center.y+this.radius)
    } 
  }
  
  cp.DiscObject.prototype.contains = function (point) { 
    return point.dist2(this.center) < this.radius*this.radius;
  }

  /**
   * PolygonObject - Define an opaque polygon object
   * @arg points: array of Vec2, points of the polygon
   */
  cp.PolygonObject = function (points) {
    this.points = points;
  }
  inherit(cp.PolygonObject, cp.OpaqueObject);

  cp.PolygonObject.prototype.bounds = function () {
    var topleft = this.points[0].copy();
    var bottomright = topleft.copy();
    for (var p=1; p<this.points.length; ++p) {
      var point = this.points[p];
      if (point.x > bottomright.x)
        bottomright.x = point.x;
      if (point.y > bottomright.y)
        bottomright.y = point.y;
      if (point.x < topleft.x)
        topleft.x = point.x;
      if (point.y < topleft.y)
        topleft.y = point.y;
    }
    return { topleft: topleft, bottomright: bottomright };
  }

  cp.PolygonObject.prototype.contains = function (p) {
    var points = this.points;
    var i, j=points.length-1;
    var x = p.x, y = p.y;
    var oddNodes = false;

    for (i=0; i<points.length; i++) {
      if ((points[i].y< y && points[j].y>=y
      ||   points[j].y< y && points[i].y>=y)
      &&  (points[i].x<=x || points[j].x<=x)) {
        if (points[i].x+(y-points[i].y)/(points[j].y-points[i].y)*(points[j].x-points[i].x)<x) {
          oddNodes=!oddNodes; 
        }
      }
      j=i; 
    }
    return oddNodes;
  }

  cp.PolygonObject.prototype.path = function (ctx) {
    path(ctx, this.points);
  }
  /**
   * cast shadows renders a black mask of the shadow
   */
  cp.PolygonObject.prototype.cast = function (ctx, origin, bounds) {
    // The current implementation of projection is a bit hacky... do you have a proper solution?
    var distance = ((bounds.bottomright.x-bounds.topleft.x)+(bounds.bottomright.y-bounds.topleft.y))/2;
    this._forEachVisibleEdges(origin, bounds, function (a, b, originToA, originToB, aToB) {
      var m; // m is the projected point of origin to [a, b]
      var t = originToA.inv().dot(aToB)/aToB.length2();
      if (t<0)
        m = a;
      else if(t>1)
        m = b;
      else
        m = a.add( aToB.mul(t) );
      var originToM = m.sub(origin);
      // normalize to distance
      originToM = originToM.normalize().mul(distance);
      originToA = originToA.normalize().mul(distance);
      originToB = originToB.normalize().mul(distance);
      // project points
      var oam = a.add(originToM);
      var obm = b.add(originToM);
      var ap = a.add(originToA);
      var bp = b.add(originToB);
      ctx.beginPath();
      path(ctx, [a, b, bp, obm, oam, ap]);
      ctx.fill();
    });
  }

  cp.PolygonObject.prototype._forEachVisibleEdges = function (origin, bounds, f) {
    var a = this.points[this.points.length-1], b;
    for (var p=0; p<this.points.length; ++p, a=b) {
      b = this.points[p];
      if (bounds.topleft.x < a.x && a.x < bounds.bottomright.x
       && bounds.topleft.y < a.y && a.y < bounds.bottomright.y) {
         var originToA = a.sub(origin);
         var originToB = b.sub(origin);
         var aToB = b.sub(a);
         var normal = new cp.Vec2(aToB.y, -aToB.x);
         if (normal.dot(originToA) < 0) {
           f(a, b, originToA, originToB, aToB);
         }
       }
    }
  }

  cp.TriangleObject = function (a, b, c) {
    this.__super.constructor.call(this, [a, b, c]);
  }
  inherit(cp.TriangleObject, cp.PolygonObject);

  cp.RectangleObject = function (topleft, bottomright) {
    var a = topleft;
    var b = new cp.Vec2(bottomright.x, topleft.y);
    var c = bottomright;
    var d = new cp.Vec2(topleft.x, bottomright.y);
    this.__super.constructor.call(this, [a, b, c, d]);
  }
  inherit(cp.RectangleObject, cp.PolygonObject);

  cp.RectangleObject.prototype.fill = function (ctx) {
    var x = this.points[0].x, y = this.points[0].y;
    ctx.rect(x, y, this.points[2].x-x, this.points[2].y-y);
  }
  
  cp.LineObject = function (a, b) {
    this.__super.constructor.call(this, [a, b]);
  }
  inherit(cp.LineObject, cp.PolygonObject);

  /**
   * Lighting - Provide a lighting effect which projects shadows on opaque objects
   * @arg light: a Light object which project light in the scene
   * @arg objects: all opaque objects which stop the light and create shadows
   */
  cp.Lighting = function (light, objects, diffuse) {
    this.light = light;
    this.objects = objects || [];
    this.diffuse = diffuse || 0;

    this.cache = null;
  }
  cp.Lighting.prototype.createCache = function (w, h) {
    this.cache = createCanvasAnd2dContext(w,h);
    this.castcache = createCanvasAnd2dContext(w,h);
  }

  cp.Lighting.prototype.cast = function (ctxoutput) {
    var light = this.light;
    var n = light.samples;
    var c = this.castcache;
    var ctx = c.ctx;
    ctx.clearRect(0, 0, c.w, c.h);
    // Draw shadows for each light sample and objects
    ctx.fillStyle = "rgba(0,0,0,"+Math.round(100/n)/100+")"; // Is there any better way?
    var bounds = light.bounds();
    var objects = this.objects;
    light.forEachSample(function (position) {
      objects.forEach(function(object) {
        object.cast(ctx, position, bounds);
      });
    });
    // Draw objects diffuse - the intensity of the light penetration in objects
    ctx.fillStyle = "rgba(0,0,0,"+(1-this.diffuse)+")";
    objects.forEach(function(object) {
      ctx.beginPath();
      object.path(ctx);
      ctx.fill();
    });
    ctxoutput.drawImage(c.canvas, 0, 0);
  }

  cp.Lighting.prototype.lightInObject = function () {
    for (var o=0; o<this.objects.length; ++o) {
      if (this.objects[o].contains(this.light.position))
        return true;
    }
    return false;
  }

  cp.Lighting.prototype.compute = function (w,h) {
    if (!this.cache || this.cache.w != w || this.cache.h != h)
      this.createCache(w, h);
    var ctx = this.cache.ctx;
    var light = this.light;
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    if (!this.lightInObject()) {
      light.render(ctx);
      ctx.globalCompositeOperation = "destination-out";
      this.cast(ctx);
    }
    ctx.restore();
  }
  cp.Lighting.prototype.render = function (ctx) {
    ctx.drawImage(this.cache.canvas, 0, 0);
  }

  /**
   * DarkMask - Provide a dark mask which is transparent in lights
   */
  cp.DarkMask = function (lights, color) {
    this.lights = lights || [];
    this.color = color || 'rgba(0,0,0,0.9)';
  }

  cp.DarkMask.prototype.compute = function (w,h) {
    if (!this.cache || this.cache.w != w || this.cache.h != h)
      this.cache = createCanvasAnd2dContext(w,h);
    var ctx = this.cache.ctx;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-out";
    this.lights.forEach(function(light){
      light.mask(ctx);
    });
    ctx.restore();
  }
  cp.DarkMask.prototype.render = function (ctx) {
    ctx.drawImage(this.cache.canvas, 0, 0);
  }

  /**
   * Vec2 - A 2D Vector with some operations on it
   */
  cp.Vec2 = function (x, y) {
    this.x = x||0;
    this.y = y||0;
  }

  cp.Vec2.prototype.copy = function () {
    return new cp.Vec2(this.x, this.y);
  }
  cp.Vec2.prototype.dot = function (v) {
    return v.x*this.x + v.y*this.y;
  }
  cp.Vec2.prototype.sub = function (v) {
    return new cp.Vec2(this.x-v.x, this.y-v.y);
  }
  cp.Vec2.prototype.add = function (v) {
    return new cp.Vec2(this.x+v.x, this.y+v.y);
  }
  cp.Vec2.prototype.mul = function (n) {
    return new cp.Vec2(this.x*n, this.y*n);
  }
  cp.Vec2.prototype.inv = function () {
    return this.mul(-1);
  }
  cp.Vec2.prototype.dist2 = function (v) {
    var dx = this.x - v.x;
    var dy = this.y - v.y;
    return dx*dx + dy*dy;
  }
  cp.Vec2.prototype.normalize = function () {
    var length = Math.sqrt(this.length2());
    return new cp.Vec2(this.x/length, this.y/length);
  }
  cp.Vec2.prototype.length2 = function (v) {
    return this.x*this.x + this.y*this.y;
  }

  // UTILS & CONSTANTS

  var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  var _2PI = 2*Math.PI;

  function createCanvasAnd2dContext (w, h) {
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return { canvas: canvas, ctx: canvas.getContext("2d"), w: w, h: h };
  }
  cp.createCanvasAnd2dContext = createCanvasAnd2dContext;

  function path (ctx, points, dontJoinLast) {
    var p = points[0];
    ctx.moveTo(p.x, p.y);
    for (var i=1; i<points.length; ++i) {
      p = points[i];
      ctx.lineTo(p.x, p.y);
    }
    if (!dontJoinLast && points.length>2) {
      p = points[0];
      ctx.lineTo(p.x, p.y);
    }
  }
  cp.path = path;

  function emptyFn() {};
  function inherit (cls, base) { // from Box2d
    var tmpCtr = cls;
    emptyFn.prototype = base.prototype;
    cls.prototype = new emptyFn;
    cls.prototype.constructor = tmpCtr;
    cls.prototype.__super = base.prototype;
  }
  cp.inherit = inherit;

}(window.illuminated={}));
