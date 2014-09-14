
function Ai(camp) {
  this.camp = camp;
}
Ai.prototype = {
  camp: null,
  move: function() {
    // Find all accessible tiles.
    // List of { tile: {q,r}, nextTile: {q,r}, score: number }.
    var options = [];
    for (var tileKey in visibleTiles) {
      var tile = terrain.tileFromKey(tileKey);
      var terrainTile = terrain.tile(tile);
      if (terrainTile.c === this.camp.id) {
        var accessibleTiles = terrain.accessibleTiles(tile);
        for (var nextTileKey in accessibleTiles) {
          var nextTile = terrain.tileFromKey(nextTileKey);
          options.push({
            tile: tile,
            nextTile: nextTile,
            score: this.scoreTile(tile, nextTile),
          });
        }
      }
    }
    console.log(JSON.stringify(options));
    var best = options[0];
    for (var i = 0; i < options.length; i++) {
      if (options[i].score > best.score) {
        best = options[i];
      }
    }
    console.log('picked', JSON.stringify(best));
    return {
      type: planType.move,
      at: terrain.keyFromTile(best.tile),
      to: terrain.keyFromTile(best.nextTile),
    };
  },
  // tile: {q,r}
  scoreTile: function(fromTile, tile) {
    var score = 0;
    var terrainTile = terrain.tile(tile);
    var fromTerrainTile = terrain.tile(fromTile);
    if (terrainTile.r) { score += 10; }
    if (terrainTile.c !== this.camp.id) {
      if (terrainTile.p > fromTerrainTile.p) {
        score++;
      } else {
        score += 5;
      }
    }
    if (terrain.transitionTile(fromTerrainTile.t, terrainTile.t)) {
      score += 5;
    }
    return score;
  },
};
