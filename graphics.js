// Orientation of the second pixel related to the first,
// in radians, trigonometric direction. Both pixels are {x, y}.
function orientation(p1, p2) {
  var res = Math.atan((p1.y - p2.y) / Math.abs(p2.x - p1.x));
  if (p2.x < p1.x) { res = Math.PI - res; }
  return res;
}

// Distance in pixels between two pixels {x, y}.
function pixelDistance(p1, p2) {
  var horiz = Math.abs(p1.x - p2.x);
  var vert = Math.abs(p1.y - p2.y);
  return Math.sqrt(horiz * horiz + vert * vert);
}




// Graphic State functions.
// Painting primitives.
//


// Given real hexagonal coordinates p = {q, r}, round to the nearest integer
// hexagonal coordinate.
function intPointFromReal(p) {
  var x = p.q;
  var z = p.r;
  var y = - x - z;
  var rx = Math.round(x);
  var ry = Math.round(y);
  var rz = Math.round(z);
  var x_err = Math.abs(rx - x);
  var y_err = Math.abs(ry - y);
  var z_err = Math.abs(rz - z);
  if (x_err > y_err && x_err > z_err) {
    rx = - ry - rz;
  } else if (y_err > z_err) {
    ry = - rx - rz;
  } else {
    rz = - rx - ry;
  }

  return {
    q: rx,
    r: rz
  };
}

// Given a point px = {x, y} representing a pixel position on the screen,
// and given a position px0 = {x0, y0} of the screen on the map,
// return a point {q, r} of the hexagon on the map.
// `size` is the radius of the smallest disk containing the hexagon.
function tileFromPixel(px, px0, size) {
  var xm = px.x + px0.x0;
  var ym = px.y + px0.y0;
  return intPointFromReal({
    q: (Math.sqrt(3) * xm - ym) / 3 / size,
    r: 2 * ym / 3 / size
  });
}

// Given a point p = {q, r} representing a hexagonal coordinate,
// and given a position px0 = {x0, y0} of the screen on the map,
// return a pixel {x, y} of the hexagon's center.
// `size` is the radius of the smallest disk containing the hexagon.
function pixelFromTile(p, px0, size) {
  return {
    x: ((size * Math.sqrt(3) * (p.q + p.r / 2))|0) - px0.x0,
    y: (size * 3/2 * p.r) - px0.y0
  };
}

// Random nudge to {x: 0, y:0}. The size of the nudge is given by `size`.
// `tile` {q,r} is given as input to the randomness.
// The result will be the same for each tile.
function noisyPixel(size, tile) {
  var t = terrain.tile(tile);
  var c = { x: 0, y: 0 };
  c.x += (t.a * (size << 1)) - size|0;
  c.y +=  (t.a * (size << 1)) - size|0;
  return c;
}

// Include all information pertaining to the state of the canvas.
// canvas: a DOM HTML canvas.
function makeGraphicState(canvas) {
  var ctx = canvas.getContext('2d');
  // Size of radius of the smallest disk containing the hexagon.
  var hexSize = 40;
  var spritesWidth = hexSize * 2;  // Each element of the sprite is 2x20px.
  return {
    hexSize: hexSize,
    // Pixel position of the top left screen pixel,
    // compared to the origin (pixel (0, 0)) of the map.
    origin: { x0: 0, y0: 0 },
    canvas: canvas,
    ctx: ctx,
    width: canvas.width,
    height: canvas.height,
  };
}

var canvas = document.getElementById('canvas');
canvas.width = 1280;
canvas.height = 720;
canvas.style.marginLeft = ((document.documentElement.clientWidth - canvas.width) >> 1) + 'px';
var gs = makeGraphicState(canvas);
var globalGs = gs;
// Blink and Webkit get the following wrong.
// Remove without worry
// when https://code.google.com/p/chromium/issues/detail?id=168840 is fixed.
//document.styleSheets[0].insertRule('div.controlPanel { max-height:' +
//  (gs.height - 16 - 58) + 'px; }', 0);

// Given a list of tile key "q:r" representing hexagon coordinates,
// construct the path along each hexagon's center.
// gs is the GraphicState.
function pathAlongTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  if (tiles.length < 2) { return; }
  var penultimate;
  var cp = pixelFromTile(terrain.tileFromKey(tiles[0]), origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  ctx.moveTo(cp.x|0, cp.y|0);
  for (var i = 0; i < tiles.length - 1; i++) {
    cpNext = pixelFromTile(terrain.tileFromKey(tiles[i+1]), origin, size);
    var avgPoint = averagePoint(cp, cpNext);
    ctx.quadraticCurveTo(cp.x|0, cp.y|0, avgPoint.x|0, avgPoint.y|0);
    if (i === tiles.length - 2) { penultimate = cp; }
    cp = cpNext;
  }
  // Arrow at the end.
  cp = pixelFromTile(terrain.tileFromKey(tiles[tiles.length-1]), origin, size);
  var arrowOffsetX = (penultimate.x - cp.x) / 10;
  var arrowOffsetY = (penultimate.y - cp.y) / 10;
  ctx.lineTo(cp.x + arrowOffsetX, cp.y + arrowOffsetY);
  ctx.lineTo((cp.x + arrowOffsetX - arrowOffsetY*2/3),
             (cp.y + arrowOffsetY + arrowOffsetX*2/3));
  ctx.lineTo(cp.x, cp.y);
  ctx.lineTo((cp.x + arrowOffsetX + arrowOffsetY*2/3),
             (cp.y + arrowOffsetY - arrowOffsetX*2/3));
  ctx.lineTo(cp.x + arrowOffsetX, cp.y + arrowOffsetY);
}

// Given a list of tile key "q:r" representing hexagon coordinates,
// draw the path along each hexagon's center.
// gs is the GraphicState.
function paintAlongTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  pathAlongTiles(gs, tiles);
  ctx.strokeStyle = '#ccf';
  ctx.lineWidth = '5';
  ctx.stroke();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = '3';
  ctx.stroke();
  // Reset lineWidth.
  ctx.lineWidth = '1';
}

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
// gs is the GraphicState.
function straightPathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    var cx = cp.x;
    var cy = cp.y;
    var mask = 0|0;
    for (var f = 0; f < 6; f++) {
      // For each, face, set the mask.
      var neighbor = terrain.neighborFromTile(tile, f);
      mask |= (((tiles[terrain.keyFromTile(neighbor)] !== undefined)|0) << f);
    }
    partialPathFromHex(gs, cp, mask, hexHorizDistance, hexVertDistance);
  }
}

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
// gs is the GraphicState.
function pathFromTiles(gs, tiles,
    hexHorizDistance, hexVertDistance, noisy, dashed) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  var vertices = [];
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = terrain.neighborFromTile(tile, f);
      if (tiles[terrain.keyFromTile(neighbor)] === undefined) {
        vertices = vertices.concat(vertexFromFace(tileKey, f));
      }
    }
  }
  pathFromPolygons(gs,
      polygonFromVertices(gs, vertices, hexHorizDistance, noisy), !!dashed);
}

// Just like `pathFromTiles` above, but with polygonally-drawn paths.
// gs is the GraphicState.
function straightPolygonPathFromTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  ctx.beginPath();
  var vertices = [];
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = terrain.neighborFromTile(tile, f);
      if (tiles[terrain.keyFromTile(neighbor)] === undefined) {
        vertices = vertices.concat(vertexFromFace(tileKey, f));
      }
    }
  }
  var polygons = polygonFromVertices(gs, vertices, hexHorizDistance);
  for (var i = 0; i < polygons.length; i++) {
    partialPathFromPolygon(gs, polygons[i]);
  }
}

// Given a face 0…5 (0 = right, 1 = top right…), return the two vertices
// delimiting the segment for that face.
function vertexFromFace(tileKey, face) {
  var vertex1 = (face + 4) % 6;
  var vertex2 = (vertex1 + 1) % 6;
  return [
    vertexFromTileKey(tileKey, vertex1),
    vertexFromTileKey(tileKey, vertex2)
  ];
}

// Coordinate system for vertices.
// Takes a tileKey "q:r" and a vertex 0…5 (0 = top, 1 = top left…)
// Returns a vertex key "q:r:0" for the bottom right vertex of tile "q:r", and
// "q:r:1" for the top right vertex of tile "q:r".
function vertexFromTileKey(tileKey, vertex) {
  if (vertex === 0) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 2)) + ":0";
  } else if (vertex === 1) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 3)) + ":1";
  } else if (vertex === 2) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 3)) + ":0";
  } else if (vertex === 3) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 4)) + ":1";
  } else if (vertex === 4) {
    return tileKey + ":0";
  } else if (vertex === 5) {
    return tileKey + ":1";
  } else { return "invalid:vertex:key"; }
}

// Take a vertex key "q:r:0", return the {x,y} point in the screen's coordinate.
// gs is the GraphicState.
function pointFromVertex(gs, vertex, hexHorizDistance, noisy) {
  var size = gs.hexSize; var origin = gs.origin;
  var vertexSide = +vertex.slice(-1);
  var tileKey = vertex.slice(0, -2);
  var tile = terrain.tileFromKey(tileKey);
  var cp = pixelFromTile(tile, origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  var halfHorizDistance = hexHorizDistance/2|0;
  var halfSize = size/2|0;
  var ncx = noisy? noisyPixel(size, tile): {x:0, y:0};
  if (vertexSide === 0) {
    return { x: cx + halfHorizDistance + ncx.x, y: cy + halfSize + ncx.y };
  } else if (vertexSide === 1) {
    return {x: cx + halfHorizDistance, y: cy - halfSize};
  }
}

// Given a list of vertices "q:r:0" containing from / to line information,
// return a list of polygons [{x,y}] with no duplicate point.
// gs is the GraphicState.
function polygonFromVertices(gs, vertices, hexHorizDistance, noisy) {
  var size = gs.hexSize; var origin = gs.origin;
  var verticesLeft = new Array(vertices.length);
  for (var i = 0; i < vertices.length; i++) {
    verticesLeft[i] = vertices[i];
  }
  var polygons = [];
  while (verticesLeft.length > 0) {
    var startVertex = verticesLeft.shift();
    var currentVertex = verticesLeft.shift();
    var polygon = [
      pointFromVertex(gs, startVertex, hexHorizDistance, noisy),
      pointFromVertex(gs, currentVertex, hexHorizDistance, noisy)
    ];
    var infiniteLoopCut = 10000;
    while (currentVertex !== startVertex && (infiniteLoopCut--) > 0) {
      for (var i = 0; i < verticesLeft.length; i += 2) {
        if (verticesLeft[i] === currentVertex) {
          polygon.push(pointFromVertex(gs, verticesLeft[i+1],
                hexHorizDistance, noisy));
          currentVertex = verticesLeft[i+1];
          verticesLeft.splice(i, 2);
          break;
        } else if (verticesLeft[i+1] === currentVertex) {
          polygon.push(pointFromVertex(gs, verticesLeft[i],
                hexHorizDistance, noisy));
          currentVertex = verticesLeft[i];
          verticesLeft.splice(i, 2);
          break;
        }
      }
    }
    polygon.pop();
    polygons.push(polygon);
  }
  return polygons;
}

// Continue the path of a polygon [{x,y}].
// gs is the GraphicState.
function partialPathFromPolygon(gs, polygon) {
  var ctx = gs.ctx;
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (var i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();
}

// Construct the path of list of polygons [{x,y}].
// gs is the GraphicState.
function pathFromPolygons(gs, polygons, dashed) {
  var ctx = gs.ctx;
  ctx.beginPath();
  for (var i = 0; i < polygons.length; i++) {
    partialPathForSmoothPolygon(gs, polygons[i], !!dashed);
  }
}

// Average point {x,y} of two points {x,y}.
function averagePoint(a, b) {
  return { x:(a.x + b.x)>>1, y:(a.y + b.y)>>1 };
}
// Given a point b {x,y} and two points around it in a polygon,
// return a point which makes the three points further apart.
function extremizePoint(a, b, c) {
  var avgPoint = averagePoint(a1, c2);
  var avgPointLocal = averagePoint(a2, c1);
  return { x:b.x - ((avgPoint.x - b.x)/2)|0 + ((avgPointLocal.x - b.x)/2)|0, y:b.y - ((avgPoint.y - b.y)/2)|0 + ((avgPointLocal.y - b.y)/2)|0 };
}

// Given a canvas context and a polygon [{x,y}],
// construct the path that draws a smoother version of the polygon.
// gs is the GraphicState.
function partialPathForSmoothPolygon(gs, oldPolygon, dashed) {
  dashed = !!dashed;
  var ctx = gs.ctx;
  if (oldPolygon.length < 3) { return partialPathFromPolygon(gs, oldPolygon); }
  // This polygon's vertices are the middle of each edge.
  var polygon = new Array(oldPolygon.length);
  var avgPoint;
  for (var i = 0; i < oldPolygon.length; i++) {
    avgPoint = averagePoint(oldPolygon[i], oldPolygon[(i+1)%oldPolygon.length]);
    polygon[i] = avgPoint;
  }
  // Spline between the middle of each edge,
  // making each vertex the control point.
  var avgPoint = averagePoint(polygon[0], polygon[1]);
  ctx.moveTo(avgPoint.x, avgPoint.y);
  for (var i = 1; i < polygon.length; i++) {
    avgPoint = averagePoint(polygon[i], polygon[(i+1)%polygon.length]);
    if (dashed && ((i % 2) === 0)) {
      ctx.moveTo(avgPoint.x, avgPoint.y);
      continue;
    }
    ctx.quadraticCurveTo(polygon[i].x, polygon[i].y,
                         avgPoint.x, avgPoint.y);
  }
  if (dashed) { return; }
  avgPoint = averagePoint(polygon[0], polygon[1]);
  ctx.quadraticCurveTo(polygon[0].x, polygon[0].y,
                       avgPoint.x, avgPoint.y);
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
// The mask is a sequence of six bits, each representing a hexagon edge,
// that are set to 1 in order to hide that edge.
// gs is the GraphicState.
// Returns a list of all points {x,y} gone through.
function partialPathFromHex(gs, cp, mask,
                            hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize;
  mask = mask|0;
  var cx = cp.x|0;
  var cy = cp.y|0;
  var halfHorizDistance = hexHorizDistance/2|0;
  var halfSize = size/2|0;
  ctx.moveTo(cx, cy - size);    // top
  // top left
  var x = cx - halfHorizDistance;
  var y = cy - halfSize;
  if ((mask & 4) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom left
  x = cx - halfHorizDistance;
  y = cy + halfSize;
  if ((mask & 8) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom
  x = cx;
  y = cy + size;
  if ((mask & 16) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom right
  x = cx + halfHorizDistance;
  y = cy + halfSize;
  if ((mask & 32) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // top right
  x = cx + halfHorizDistance;
  y = cy - halfSize;
  if ((mask & 1) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // top
  x = cx;
  y = cy - size;
  if ((mask & 2) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
// gs is the GraphicState.
function pathFromHex(gs, cp,
                     hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize;
  ctx.beginPath();
  partialPathFromHex(gs, cp, 0, hexHorizDistance, hexVertDistance);
}

// Paint a white line around `tiles`
// (a map from tile keys (see keyFromTile) representing the coordinates of a
// hexagon, to a truthy value).
// Requires a canvas context `ctx` and the size of a hexagon
// (ie, the radius of the smallest disk containing the hexagon).
// gs is the GraphicState.
function paintAroundTiles(gs, tiles, color) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  pathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance, /*noisy*/ true);
  ctx.strokeStyle = color || 'white';
  ctx.stroke();
}

// Paint each tile, and paint links from currentTile.
// tiles: map from "q:r" to truthy values.
// gs is the GraphicState.
function paintAccessibleTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // Show tiles controlled by a player.
  if (currentTile != null && playerCamp != null) {
    paintTileHexagon(gs, currentTile, campHsl(gameState.turn, 50, 40), 5);
    var from = pixelFromTile(currentTile, origin, size);
    for (var tileKey in tiles) {
      var path = tiles[tileKey];
      var pathFrom = from;
      for (var i = 0; i < path.length; i++) {
        var pathTo = pixelFromTile(terrain.tileFromKey(
              path[i]), origin, size);
        paintMouseMovement(gs, pathFrom, pathTo, 'rgba(200,200,200,0.5)');
        pathFrom = pathTo;
      }
    }
  }
  for (var tileKey in tiles) {
    var color = 'rgba(255,255,255,0.3)';
    if (terrain.transitionTile(currentTile, terrain.tileFromKey(tileKey))) {
      color = 'rgba(255,140,140,0.3)';
    }
    paintTileHexagon(gs, terrain.tileFromKey(tileKey), color, 5);
  }
}

// Same as above, with the straight line algorithm.
// gs is the GraphicState.
function paintStraightAroundTiles(gs, tiles, color) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  straightPathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = color || 'white';
  ctx.stroke();
}

// gs is the GraphicState.
function paintTileHexagon(gs, tile, color, lineWidth) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  var cp = pixelFromTile(tile, origin, size);
  var radius = hexVertDistance >> 2;
  ctx.beginPath();
  ctx.arc(cp.x, cp.y, radius, 0, 2*Math.PI, true);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth? lineWidth: 3;
  ctx.stroke();
  ctx.lineWidth = 1;
}

var mπd3 = - Math.PI / 3;   // Minus PI divided by 3.


// Paint on a canvas with hexagonal tiles.
// gs is the GraphicState.
function paintTilesRaw(gs, end) {
  var width = gs.width;
  var height = gs.height;
  // The `origin` {x0, y0} is the position of the top left pixel on the screen,
  // compared to the pixel (0, 0) on the map.
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var imgdata = ctx.getImageData(0, 0, width, height);
  var data = imgdata.data;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tilePos = tileFromPixel({ x:x, y:y }, origin, size);
      var t = terrain.tile(tilePos);
      var color = [0, 0, 0];
      if (t.t == element.earth) {
        color = [0, 180, 0];
      } else if (t.t == element.fire) {
        color = [180, 0, 0];
      } else if (t.t == element.air) {
        color = [180, 100, 0];
      } else if (t.t == element.water) {
        color = [50, 50, 180];
      }
      // Pixel noise
      var position = (x + y * width) * 4;
      var pixelDelta = 40;
      for (var i = 0; i < 3; i++) {
        color[i] += ((Math.random() * pixelDelta)|0) - (pixelDelta >> 1);
        data[position + i] = color[i];
      }
      data[position + 3] = 255;
    }
  }
  ctx.putImageData(imgdata, 0, 0);
  paintNoise(gs, function() {
    paintResources(gs);
    end();
  });
}

// Map from "q:r" tiles on the screen to truthy values.
var allTiles = null
var visibleTiles = null;
function computeVisibleTiles(gs) {
  if (visibleTiles !== null) { return; }
  allTiles = Object.create(null);
  visibleTiles = Object.create(null);
  var width = gs.width;
  var height = gs.height;
  // The `origin` {x0, y0} is the position of the top left pixel on the screen,
  // compared to the pixel (0, 0) on the map.
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // This is a jigsaw. We want the corner tiles of the screen.
  var tilePos = tileFromPixel({ x:0, y:0 }, origin, size);
  var centerPixel = pixelFromTile({ q: tilePos.q, r: tilePos.r-1 },
    origin, size);
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;

  var offLeft = true;     // Each row is offset from the row above.
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  while (cy - hexVertDistance < height) {
    while (cx - hexHorizDistance < width) {
      tilePos = tileFromPixel({ x:cx, y:cy }, origin, size);
      allTiles[terrain.keyFromTile(tilePos)] = true;
      if ((cx - hexHorizDistance/2 > 0) && (cx + hexHorizDistance/2 < gs.width)
        &&(cy - hexVertDistance/2 > 0) && (cy + hexVertDistance/2 < gs.height)) {
        visibleTiles[terrain.keyFromTile(tilePos)] = true;
      }
      cx += hexHorizDistance;
    }
    cy += hexVertDistance;
    cx = centerPixel.x;
    if (offLeft) {
      cx -= hexHorizDistance / 2;   // This row is offset.
      offLeft = false;
    } else {
      offLeft = true;
    }
    cx = cx|0;
    cy = cy|0;
  }
}

var colorFromElement = new Array(4);
colorFromElement[element.earth] = '#7a4';
colorFromElement[element.fire] = '#b94';
colorFromElement[element.air] = '#974';
colorFromElement[element.water] = '#44a';

// Paint all map with…
function paintEarth(gs) {
  gs.ctx.fillStyle = colorFromElement[element.earth];
  gs.ctx.fill();
}
function paintFire(gs) {
  gs.ctx.fillStyle = colorFromElement[element.fire];
  gs.ctx.fill();
}
function paintAir(gs) {
  gs.ctx.fillStyle = colorFromElement[element.air];
  gs.ctx.fill();
}
function paintWater(gs) {
  gs.ctx.fillStyle = colorFromElement[element.water];
  gs.ctx.fill();
}

// Paint on a canvas with smoothed hexagonal tiles.
// gs is the GraphicState.
function paintTilesSmooth(gs, end) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;

  var painterFromTileType = [];
  painterFromTileType[element.earth] = paintEarth;
  painterFromTileType[element.fire] = paintFire;
  painterFromTileType[element.air] = paintAir;
  painterFromTileType[element.water] = paintWater;

  for (var tileType = 0; tileType < 4; tileType++) {
    var tiles = Object.create(null);
    // Add all tiles of that type.
    for (var tileKey in allTiles) {
      var tile = terrain.tileFromKey(tileKey);
      var t = terrain.tile(tile);
      if (t.t >= tileType) {
        tiles[tileKey] = true;
      }
    }
    pathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance, /*noisy*/ true);

    // Paint that specific tile.
    ctx.save();
    ctx.clip();
    painterFromTileType[tileType](gs);
    ctx.restore();
  }

  paintNoise(gs, function() {
    paintResources(gs);
    end();
  });
}

// Paint some random noise.
function paintNoise(gs, end) {
  var seed = (Math.random() * 1000)|0;
  var transparency = 0.3;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + gs.width + '" height="' + gs.height + '"><filter id="a" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".01" numOctaves="5" seed="' + seed + '"/><feColorMatrix values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 ' + transparency + '"/></filter><rect width="100%" height="100%" filter="url(#a)"/></svg>';
  var image = new Image();
  image.src = 'data:image/svg+xml;base64,' + btoa(svg);
  image.onload = function() {
    gs.ctx.drawImage(image, 0, 0);
    end();
  };
}

// Audio
var audiocr = new Audio();
var audiopop = new Audio();
window.addEventListener('load', function() {
  audiocr.src = 'cr.mp3';
  audiopop.src = 'pop.mp3';
});

// Paint visible tiles' resources.
function paintResources(gs) {
  var width = gs.width;
  var height = gs.height;
  // The `origin` {x0, y0} is the position of the top left pixel on the screen,
  // compared to the pixel (0, 0) on the map.
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // This is a jigsaw. We want the corner tiles of the screen.
  var tilePos = tileFromPixel({ x:0, y:0 }, origin, size);
  var centerPixel = pixelFromTile({ q: tilePos.q, r: tilePos.r-1 },
    origin, size);
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;

  var offLeft = true;     // Each row is offset from the row above.
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  while (cy - hexVertDistance < height) {
    while (cx - hexHorizDistance < width) {
      tilePos = tileFromPixel({ x:cx, y:cy }, origin, size);
      var t = terrain.tile(tilePos);

      if (t.r) {
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, 2*Math.PI, true);
        ctx.closePath();
        ctx.strokeStyle = 'black';
        ctx.stroke();
      }

      cx += hexHorizDistance;
    }
    cy += hexVertDistance;
    cx = centerPixel.x;
    if (offLeft) {
      cx -= hexHorizDistance / 2;   // This row is offset.
      offLeft = false;
    } else {
      offLeft = true;
    }
    cx = cx|0;
    cy = cy|0;
  }
}

// gs is the GraphicState.
function paintLinks(gs) {
  for (var tileKey in visibleTiles) {
    paintLink(gs, tileKey);
  }
}

// tileKey: "q:r".
function paintLink(gs, tileKey) {
  var ctx = gs.ctx;
  var tile = terrain.tileFromKey(tileKey);
  var terrainTile = terrain.tile(tile);
  var from = pixelFromTile(tile, gs.origin, gs.hexSize);
  for (var i = 0; i < terrainTile.n.length; i++) {
    var next = terrainTile.n[i];
    var to = pixelFromTile(terrain.tileFromKey(next), gs.origin, gs.hexSize);
    var campColor = campHsl(terrainTile.c, 50, 40);
    paintMouseMovement(gs, from, to, campColor);
    ctx.setLineDash(marchingAntsDash);
    ctx.lineDashOffset = marchingAnts;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(from.x, from.y);
    ctx.strokeStyle = campColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

var tilesPaintCache;

function paintTilesRawCached(gs, end) {
  if (tilesPaintCache == null) {
    tilesPaintCache = document.createElement('canvas');
    tilesPaintCache.width = gs.width;
    tilesPaintCache.height = gs.height;
    var gsBuffer = makeGraphicState(tilesPaintCache);
    gsBuffer.hexSize = gs.hexSize;
    gsBuffer.origin = gs.origin;
    paintTilesSmooth(gsBuffer, function() {
      gs.ctx.drawImage(tilesPaintCache, 0, 0);
      end();
    });
  } else {
    gs.ctx.drawImage(tilesPaintCache, 0, 0);
    end();
  }
}


// Paint on a canvas.
// gs is the GraphicState.
function paint(gs) {
  paintTilesRawCached(gs, function(){
    paintIntermediateUI(gs);
  });
}

// Top left pixel of the canvas related to the window.
var canvasOrigin = {
  clientX: canvas.offsetLeft,
  clientY: canvas.offsetTop
};

// Take a {clientX, clientY} pixel position in the page.
// Return a {x, y} pixel position from the top left pixel of the canvas.
function pixelFromClient(client) {
  return {
    x: client.clientX - canvasOrigin.clientX,
    y: client.clientY - canvasOrigin.clientY
  };
}

// gs is the GraphicState.
// from, to: pixels {x,y} from top left of canvas.
// color: CSS color as a string.
function paintMouseMovement(gs, from, to, color) {
  color = color || '#333';
  var ctx = gs.ctx;
  var deltaX = to.x - from.x;
  var deltaY = to.y - from.y;
  var portions = 20;
  var dx = deltaX / portions;
  var dy = deltaY / portions;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  var fromx = from.x;
  var fromy = from.y;
  for (var i = 0; i < portions; i++) {
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    fromx += dx;
    fromy += dy;
    ctx.lineTo(fromx, fromy);
    var quotient = i / portions - 0.5;
    ctx.lineWidth = 7 * (4 * quotient * quotient + 0.1);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.lineTo(to.x, to.y);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.lineWidth = 1;
}

var showTitleScreen = true;
setTimeout(function() { showTitleScreen = false; }, 8000);

// Paint the UI for population, winner information, etc.
// gs is the GraphicState.
function paintIntermediateUI(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  paintLinks(gs);
  // Paint the set of accessible tiles.
  paintAccessibleTiles(gs, accessibleTiles);
  if (currentlyDragging) {
    var from = pixelFromTile(tileFromPixel(pixelFromClient(startMousePosition),
          gs.origin, gs.hexSize), gs.origin, gs.hexSize);
    var to = pixelFromClient(lastMousePosition);
    paintMouseMovement(gs, from, to, '#333');
  }
  paintCamps(gs);
  paintTileMessages(gs);
  if (gameOver !== undefined) {
    drawTitle(gs, [
        gameOver.winType + " Victory.",
        (gameOver.winners[0] === playerCamp
         ? ("YOU WON! (" + nth(localStorage.getItem('gamesWon')) + " win!)")
         : ("YOU NEARLY WON! " +
            "(" + nth(gameOver.winners.indexOf(playerCamp) + 1) + " place!)")),
        "You can reload to engage in the next game!"],
        campHsl(gameOver.winners[0]));
  }
  if (showTitleScreen) {
    drawTitle(gs, ["Welcome to Thaddée Tyl's…", "A Verse On Leverage",
        "Give me a lever long enough; I shall lift the universe!"], 'silver');
  }
  displayedPaintContext.drawImage(canvas, 0, 0);
}

// Return the string corresponding to a rank (eg, 1→1st, etc.).
function nth(n) {
  n = n|0;
  var strNum = ''+n;
  if (strNum.charCodeAt(strNum.length - 2) === 49) { return strNum + 'th'; }
  var mod = n % 10;
  if (mod === 1) { return strNum + 'st';
  } else if (mod === 2) { return strNum + 'nd';
  } else if (mod === 3) { return strNum + 'rd';
  } else { return strNum + 'th'; }
}

// Draw three lines of text from a list of strings on the screen.
// gs is the GraphicState.
function drawTitle(gs, lines, color) {
  var ctx = gs.ctx;
  var width = gs.width;
  var height = gs.height;
  var line1 = lines[0];
  var line2 = lines[1];
  var line3 = lines[2];
  ctx.fillStyle = color || 'black';
  if (color) { ctx.strokeStyle = 'black'; }
  ctx.textAlign = 'center';
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line1, width / 2, height * 1/3);
  if (color) { ctx.strokeText(line1, width / 2, height * 1/3); }
  ctx.font = (height / 8) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line2, width / 2, height * 13/24);
  if (color) { ctx.strokeText(line2, width / 2, height * 13/24); }
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line3, width / 2, height * 2/3);
  if (color) { ctx.strokeText(line3, width / 2, height * 2/3); }
  ctx.textAlign = 'start';
}


// Animations.

// Pixels currently on display. Useful for smooth animations.
var displayedPaint = document.createElement('canvas');
displayedPaint.width = gs.width;
displayedPaint.height = gs.height;
var displayedPaintContext = displayedPaint.getContext('2d');


var marchingAnts = 0;
var marchingAntsDash = [2, 10];
var marchingAntsPhase = marchingAntsDash[0] + marchingAntsDash[1];

function animations() {
  marchingAnts = ((marchingAnts|0) + 1) % marchingAntsPhase;
  //paintHumans(gs, humanityData);
  //updateHumans();
}
var animationTimeout = setInterval(animations, 33);




// gs is the GraphicState.
function paintCamps(gs) {
  for (var tileKey in visibleTiles) {
    paintCampLocation(gs, tileKey);
  }
}

// tileKey: "q:r".
function paintCampLocation(gs, tileKey) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var tile = terrain.tileFromKey(tileKey);
  var humans = terrain.tile(tile);
  if (humans.c !== (void 0) && humans.p > 0) {
    var cp = pixelFromTile(tile, gs.origin, gs.hexSize);
    var radius = 10;

    ctx.beginPath();
    ctx.arc(cp.x, cp.y, radius, 0, 2*Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = campHsl(humans.c, 50, 40);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cp.x, cp.y, radius - 2, 0, 2*Math.PI, true);
    ctx.closePath();
    ctx.strokeStyle = 'white';
    ctx.stroke();

    ctx.font = radius + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    var power = '' + humans.p;
    var powerSize = ctx.measureText(power).width;
    ctx.fillText(power, cp.x, cp.y + radius / 4);
  }
}

// Return CSS hsl string.
// saturation: number from 0 to 100.
// lightness: number from 0 to 100.
function campHsl(camp, saturation, lightness, alpha) {
  if (saturation == null) { saturation = 100; }
  if (lightness == null) { lightness = 45; }
  if (alpha == null) { alpha = 1; }
  return 'hsla(' + campHueCreator9000(camp)
      + ',' + saturation + '%,' + lightness + '%,' + alpha + ')';
}

// The name is not a joke.
function campHueCreator9000(camp) {
  if (camp > 0) { return (campHueCreator9000(camp - 1) + 60) % 360;
  } else { return 270;
  }
}

// Map from tile = "q:r" to {message, timeout} (including timeout IDs).

// Add textual bubble set in tileMessages
// (a map from tile = "q:r" to {message, timeout})
// to tiles in tileKeys = ["q:r"]
// from messages = [message]
function addHumanMessages(tileMessages, tileKeys, messages) {
  var timeout;
  for (var i = 0; i < tileKeys.length; i++) {
    var tileKey = tileKeys[i];
    if (tileMessages[tileKey]) {
      clearTimeout(tileMessages[tileKey].timeout);
    }
    // Pick message.
    var msg = messages[(messages.length * Math.random())|0];
    // Set timeout.
    tileMessages[tileKey] = {
      message: msg,
      timeout: setTimeout((function (tileKey) {
        return function removeTimeout() {
          delete tileMessages[tileKey];
        };
      }(tileKey)), 2000)
    };
  }
}

// Given a tileKey = "q:r" and a message, show a textual bubble.
// gs is the GraphicState.
function paintMessage(gs, tileKey, msg) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.font = '14px "Linux Biolinum", sans-serif';
  var msgSize = ctx.measureText(msg).width;
  // Find the pixel to start from.
  var center = pixelFromTile(terrain.tileFromKey(tileKey), origin, size);
  var x = center.x + size/4;
  var y = center.y - size/4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 2, y - 10);
  ctx.lineTo(x - 12, y - 10);
  ctx.lineTo(x - 10, y - 40);
  ctx.lineTo(x + msgSize + 10, y - 35);
  ctx.lineTo(x + msgSize, y - 10);
  ctx.lineTo(x + 12, y - 10);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.strokeText(msg, x - 4, y - 20);
}

// Paints messages from warTiles and starvedTiles.
// gs is the GraphicState.
function paintTileMessages(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  //for (var tileKey in warTiles) {
  //  paintMessage(gs, tileKey, warTiles[tileKey].message);
  //}
}




// Initialization and event management.
//

// Control buttons.


window.onkeydown = function keyInputManagement(event) {
  var voidCache = false;
  var redraw = false;
  if (event.keyCode === 39 || event.keyCode === 68) {           // D
    // FIXME: show debug mode (all accessible tiles).
  }
};


// Selection.

// Map from tileKey to camp index.
var accessibleTiles;
var currentTile;  // {q,r}
var targetTile;

function mouseSelection(event) {
  gs.canvas.removeEventListener('mousemove', mouseDrag);
  gs.canvas.removeEventListener('mouseup', mouseSelection);
};

// Map dragging.

function mouseDrag(event) {
  gs.canvas.style.cursor = 'move';
  gs.canvas.removeEventListener('mousemove', mouseDrag);
  gs.canvas.removeEventListener('mouseup', mouseSelection);
  gs.canvas.addEventListener('mouseup', mouseEndDrag);
  gs.canvas.addEventListener('mousemove', dragMap);
  currentlyDragging = true;
}

function mouseEndDrag(event) {
  gs.canvas.style.cursor = '';
  gs.canvas.removeEventListener('mousemove', dragMap);
  gs.canvas.removeEventListener('mouseup', mouseEndDrag);
  currentlyDragging = false;

  gameState.move({
    type: planType.move,
    at: terrain.keyFromTile(currentTile),
    to: terrain.keyFromTile(targetTile),
  });
}

gs.canvas.onmousedown = function mouseInputManagement(event) {
  showTitleScreen = false;
  var posTile = tileFromPixel(pixelFromClient(event), gs.origin, gs.hexSize);
  // Move there.
  currentTile = posTile;
  var terrainTile = terrain.tile(currentTile);
  switch (terrainTile.t) {
  case element.earth: uitile.textContent = 'Earth'; break;
  case element.fire: uitile.textContent = 'Fire'; break;
  case element.air: uitile.textContent = 'Air'; break;
  case element.water: uitile.textContent = 'Water'; break;
  }
  uitile.style.color = colorFromElement[terrainTile.t];
  accessibleTiles = terrain.accessibleTiles(currentTile);

  if (event.button === 0) {
    gs.canvas.addEventListener('mouseup', mouseSelection);
    gs.canvas.addEventListener('mousemove', mouseDrag);
    startMousePosition.clientX = event.clientX;
    startMousePosition.clientY = event.clientY;
    lastMousePosition.clientX = event.clientX;
    lastMousePosition.clientY = event.clientY;
  } else if (event.button === 2) {
    // FIXME: Direct move.
    mouseSelection(event);
  }
};
gs.canvas.oncontextmenu = function(e) { e.preventDefault(); };

(function() {
  var requestAnimationFrame = window.requestAnimationFrame ||
  window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame || function(f) { setTimeout(f, 0) };
  window.requestAnimationFrame = requestAnimationFrame;
}());

var startMousePosition = { clientX: 0, clientY: 0 };
var lastMousePosition = { clientX: 0, clientY: 0 };
var drawingWhileDragging = false;
var currentlyDragging = false;
function dragMap(event) {
  if (drawingWhileDragging) { return; }
  drawingWhileDragging = true;
  // Save the last mouse position.
  lastMousePosition.clientX = event.clientX;
  lastMousePosition.clientY = event.clientY;
  if (audiocr.paused) { audiocr.play(); }
  targetTile = tileFromPixel(pixelFromClient(lastMousePosition),
      gs.origin, gs.hexSize);
  requestAnimationFrame(function() {
    drawingWhileDragging = false;
  });
}

requestAnimationFrame(function repaint() {
  paint(gs);
  requestAnimationFrame(repaint);
});

// Prevents Chrome from displaying a silly text cursor
// while dragging on the canvas.
canvas.onselectstart = function() { return false; }

