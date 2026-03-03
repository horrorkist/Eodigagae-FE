(function (global) {
  "use strict";

  var PLUGIN_VERSION = "2026-03-03.1";

  if (
    global.MarkerClustering &&
    global.__naverClusterPluginVersion === PLUGIN_VERSION
  ) {
    global.__naverClusterPluginLoaded = true;
    return;
  }

  var naver = global.naver;
  if (!naver || !naver.maps) {
    return;
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function distanceMeters(a, b) {
    var R = 6371000;
    var dLat = toRad(b.lat - a.lat);
    var dLng = toRad(b.lng - a.lng);
    var s1 = Math.sin(dLat / 2);
    var s2 = Math.sin(dLng / 2);
    var aa =
      s1 * s1 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
    var c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }

  function getLatLng(marker) {
    if (!marker || typeof marker.getPosition !== "function") return null;
    var pos = marker.getPosition();
    if (!pos || typeof pos.lat !== "function" || typeof pos.lng !== "function") {
      return null;
    }

    var lat = Number(pos.lat());
    var lng = Number(pos.lng());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat: lat, lng: lng };
  }

  function averagePoint(points) {
    if (!points || points.length === 0) {
      return { lat: 0, lng: 0 };
    }

    var sumLat = 0;
    var sumLng = 0;

    for (var i = 0; i < points.length; i += 1) {
      sumLat += points[i].lat;
      sumLng += points[i].lng;
    }

    return {
      lat: sumLat / points.length,
      lng: sumLng / points.length,
    };
  }

  function MarkerClustering(options) {
    var opts = options || {};

    this._map = null;
    this._markers = Array.isArray(opts.markers) ? opts.markers.slice() : [];
    this._minClusterSize = Number(opts.minClusterSize) || 2;
    this._maxZoom = Number(opts.maxZoom) || 16;
    this._gridSize = Number(opts.gridSize) || 80;
    this._disableClickZoom = Boolean(opts.disableClickZoom);
    this._icons = Array.isArray(opts.icons) ? opts.icons.slice() : [];
    this._iconFactory = typeof opts.iconFactory === "function" ? opts.iconFactory : null;
    this._zIndex = Number(opts.zIndex) || 1200;

    this._clusterMarkers = [];
    this._clusterListeners = [];
    this._mapListeners = [];

    this.setMap(opts.map || null);
  }

  MarkerClustering.prototype.getMap = function () {
    return this._map;
  };

  MarkerClustering.prototype.setMap = function (map) {
    this._teardownMapListeners();
    this._map = map || null;

    if (!this._map) {
      this._clearClusters();
      this._setAllMarkersVisible(false);
      this._hideMarkers(this._markers);
      return;
    }

    this._mapListeners.push(
      naver.maps.Event.addListener(this._map, "idle", this.redraw.bind(this)),
    );
    this._mapListeners.push(
      naver.maps.Event.addListener(this._map, "zoom_changed", this.redraw.bind(this)),
    );

    this.redraw();
  };

  MarkerClustering.prototype.setMarkers = function (markers) {
    this._hideMarkers(this._markers);
    this._markers = Array.isArray(markers) ? markers.slice() : [];
    this.redraw();
  };

  MarkerClustering.prototype.addMarkers = function (markers) {
    if (!Array.isArray(markers) || markers.length === 0) return;
    this._markers = this._markers.concat(markers);
    this.redraw();
  };

  MarkerClustering.prototype.clear = function () {
    this._hideMarkers(this._markers);
    this._markers = [];
    this.redraw();
  };

  MarkerClustering.prototype._teardownMapListeners = function () {
    for (var i = 0; i < this._mapListeners.length; i += 1) {
      naver.maps.Event.removeListener(this._mapListeners[i]);
    }
    this._mapListeners = [];
  };

  MarkerClustering.prototype._clearClusters = function () {
    for (var i = 0; i < this._clusterListeners.length; i += 1) {
      naver.maps.Event.removeListener(this._clusterListeners[i]);
    }
    this._clusterListeners = [];

    for (var j = 0; j < this._clusterMarkers.length; j += 1) {
      this._clusterMarkers[j].setMap(null);
    }
    this._clusterMarkers = [];
  };

  MarkerClustering.prototype._setAllMarkersVisible = function (visible) {
    var map = visible ? this._map : null;

    for (var i = 0; i < this._markers.length; i += 1) {
      var marker = this._markers[i];
      if (!marker || typeof marker.setMap !== "function") continue;
      marker.setMap(map);
    }
  };

  MarkerClustering.prototype._hideMarkers = function (markers) {
    if (!Array.isArray(markers)) return;

    for (var i = 0; i < markers.length; i += 1) {
      var marker = markers[i];
      if (!marker || typeof marker.setMap !== "function") continue;
      marker.setMap(null);
    }
  };

  MarkerClustering.prototype._buildContent = function (count) {
    if (this._iconFactory) {
      return this._iconFactory(count);
    }

    if (this._icons.length > 0 && this._icons[0] && typeof this._icons[0].content === "string") {
      return this._icons[0].content;
    }

    return (
      '<div style="width:40px;height:40px;border-radius:999px;background:#4b5563;color:#fff;display:flex;align-items:center;justify-content:center;transform:translate(-20px,-20px);font-weight:700;">' +
      String(count) +
      "</div>"
    );
  };

  MarkerClustering.prototype._createClusterMarker = function (cluster) {
    if (!this._map) return;

    var position = new naver.maps.LatLng(cluster.center.lat, cluster.center.lng);
    var marker = new naver.maps.Marker({
      map: this._map,
      position: position,
      clickable: true,
      zIndex: this._zIndex,
      icon: {
        content: this._buildContent(cluster.markers.length),
        anchor: new naver.maps.Point(0, 0),
      },
    });

    this._clusterMarkers.push(marker);

    if (this._disableClickZoom) return;

    var listener = naver.maps.Event.addListener(marker, "click", function () {
      if (!this._map) return;

      var currentZoom = Number(this._map.getZoom()) || 0;
      this._map.setZoom(currentZoom + 1, true);
      this._map.panTo(position);
    }.bind(this));

    this._clusterListeners.push(listener);
  };

  MarkerClustering.prototype._distanceThresholdMeters = function (zoom) {
    var normalizedZoom = Number.isFinite(zoom) ? zoom : 15;
    var delta = Math.max(0, normalizedZoom - 13);
    var scale = Math.pow(1.58, delta);
    var gridFactor = Math.max(0.6, this._gridSize / 80);
    return (430 / scale) * gridFactor;
  };

  MarkerClustering.prototype._buildClusters = function (markers, threshold) {
    var clusters = [];

    for (var i = 0; i < markers.length; i += 1) {
      var marker = markers[i];
      var point = getLatLng(marker);
      if (!point) continue;

      var target = null;
      for (var j = 0; j < clusters.length; j += 1) {
        var candidate = clusters[j];
        if (distanceMeters(candidate.center, point) <= threshold) {
          target = candidate;
          break;
        }
      }

      if (!target) {
        target = {
          markers: [],
          points: [],
          center: point,
        };
        clusters.push(target);
      }

      target.markers.push(marker);
      target.points.push(point);
      target.center = averagePoint(target.points);
    }

    return clusters;
  };

  MarkerClustering.prototype.redraw = function () {
    this._clearClusters();
    this._setAllMarkersVisible(false);

    if (!this._map) return;
    if (!Array.isArray(this._markers) || this._markers.length === 0) return;

    var zoom = Number(this._map.getZoom()) || 15;
    if (zoom > this._maxZoom) {
      this._setAllMarkersVisible(true);
      return;
    }

    var threshold = this._distanceThresholdMeters(zoom);
    var clusters = this._buildClusters(this._markers, threshold);

    for (var i = 0; i < clusters.length; i += 1) {
      var cluster = clusters[i];
      if (cluster.markers.length < this._minClusterSize) {
        for (var j = 0; j < cluster.markers.length; j += 1) {
          cluster.markers[j].setMap(this._map);
        }
        continue;
      }

      for (var k = 0; k < cluster.markers.length; k += 1) {
        cluster.markers[k].setMap(null);
      }

      this._createClusterMarker(cluster);
    }
  };

  global.MarkerClustering = MarkerClustering;
  global.__naverClusterPluginLoaded = true;
  global.__naverClusterPluginVersion = PLUGIN_VERSION;
})(window);
