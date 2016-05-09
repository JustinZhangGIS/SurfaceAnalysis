/**
 *  Elevations Profile Dijit
 *  - allows user to interactively display an elevations profile based on elevations in the display
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "put-selector/put",
  "dojo/_base/Color",
  "dojo/colors",
  "dojo/on",
  "dojo/aspect",
  "dojo/keys",
  "dojo/json",
  "dojo/dom",
  "dojo/dom-class",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Polygon",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/LineSymbol3D",
  "esri/renderers/SimpleRenderer",
  "esri/layers/GraphicsLayer",
  "dijit/registry",
  "dojox/charting/Chart",
  "dojox/charting/axis2d/Default",
  "dojox/charting/plot2d/Grid",
  "dojox/charting/themes/Bahamation",
  "dojox/charting/plot2d/Areas",
  "dojox/charting/action2d/Tooltip",
  "dojox/charting/action2d/MouseIndicator",
  "./support/ViewToggleButton",
  "./support/draw/DrawPolylineTool"
], function (declare, lang, array, put, Color, colors, on, aspect, keys, json, dom, domClass,
             Point, Polyline, Polygon, geometryEngine, Graphic, SimpleLineSymbol, LineSymbol3D, SimpleRenderer, GraphicsLayer,
             registry, Chart, Default, Grid, ChartTheme, Areas, ChartTooltip, MouseIndicator,
             ViewToggleButton, DrawPolylineTool) {

  /**
   * ElevationsProfileTool DIJIT CLASS
   */
  var ElevationsProfileTool = ViewToggleButton.createSubclass({

    declaredClass: "ElevationsProfileTool",
    baseClass: "profile-view-tool",
    iconClass: "profile-view-tool-icon",

    hasOptions: true,

    /**
     * TODO: use i18n strings...
     */
    label: "Profile",
    title: "Elevations Profile Tool",
    description: "Click on two or more locations to create an elevations profile",

    /**
     * DIJIT STARTUP
     */
    startup: function () {
      this.inherited(arguments);
      if(this.validView) {
        this.initializeLayer();
        this.initializeEvents();
      }
    },

    /**
     *
     */
    initializeLayer: function () {

      this.elevationsProfileLayer = new GraphicsLayer({
        id: "ElevationsProfileLayer",
        hasZ: true,
        elevationInfo: {
          mode: "on-the-ground"
        },
        renderer: new SimpleRenderer({
          symbol: new SimpleLineSymbol({
            color: Color.named.gold,
            width: 5.0
          })
        })
      });
      this.view.map.add(this.elevationsProfileLayer);
    },

    /**
     *
     */
    initializeEvents: function () {

      // DRAW TOOL //
      this.drawTool = new DrawPolylineTool({view: this.view});
      this.drawTool.on("update", function (evt) {
        if(evt.geometry) {
          this.doAnalysis(evt.geometry, true);
        }
      }.bind(this));
      this.drawTool.on("complete", function (evt) {
        if(evt.geometry) {
          this.doAnalysis(evt.geometry, false);
        }
      }.bind(this));

    },

    /**
     * ENABLE TOOL
     *
     * @private
     */
    enable: function () {
      this.inherited(arguments);
      this.drawTool.activate();
    },

    /**
     *
     */
    disable: function () {
      this.inherited(arguments);
      this.drawTool.deactivate();
      if(this.elevationsProfileLayer) {
        this.elevationsProfileLayer.removeAll();
      }
      this.displayProfile([]);
    },

    /**
     * TOGGLE ENABLED STATE
     *
     * @param checked
     */
    onChange: function (checked) {
      this.inherited(arguments);
      if(this.chartNode) {
        domClass.toggle(this.chartNode, "dijitOffScreen", !checked);
      }
    },

    /**
     *
     * @param elevationsProfilePolyline
     * @param isTemporary
     */
    doAnalysis: function (elevationsProfilePolyline, isTemporary) {

      if(this.elevationsProfileGraphic) {
        this.elevationsProfileLayer.remove(this.elevationsProfileGraphic);
        this.elevationsProfileGraphic = null;
      }

      var pointCount = 250;
      var distance = geometryEngine.geodesicLength(elevationsProfilePolyline, "meters");
      var denseDist = (distance / pointCount);
      var elevationsProfilePolylineDense = geometryEngine.densify(elevationsProfilePolyline, denseDist, "meters");
      var elevationsProfilePolylineDenseWithZsAndMs = this._interpolateGeometry(this.view, elevationsProfilePolylineDense);

      var elevationsProfileGraphic = new Graphic({geometry: elevationsProfilePolylineDenseWithZsAndMs});
      this.elevationsProfileLayer.add(elevationsProfileGraphic);
      if(isTemporary) {
        this.elevationsProfileGraphic = elevationsProfileGraphic;
      }

      var elevationsProfileInfos = this._getProfileInfos(elevationsProfilePolylineDenseWithZsAndMs.paths);
      this.displayProfile(elevationsProfileInfos);

    },

    /**
     *
     * @param view
     * @param geometry
     * @returns {*}
     * @private
     */
    _interpolateGeometry: function (view, geometry) {

      switch (geometry.type) {
        case "point":
          var newPoint = geometry.clone();
          newPoint.hasZ = true;
          newPoint.z = view.basemapTerrain.getElevation(geometry);
          return newPoint;
          break;

        case "polyline":
          return new Polyline({
            hasZ: true,
            hasM: true,
            paths: this._interpolateGeometryParts(view, geometry),
            spatialReference: view.spatialReference
          });
          break;

        case "polygon":
          return new Polygon({
            hasZ: true,
            hasM: true,
            rings: this._interpolateGeometryParts(view, geometry),
            spatialReference: view.spatialReference
          });
          break;
      }
    },

    /**
     *
     * @param view
     * @param geometry
     * @returns {Number[]}
     * @private
     */
    _interpolateGeometryParts: function (view, geometry) {

      var parts = geometry.rings || geometry.paths;
      var distanceAlong = 0.0;

      return array.map(parts, function (part, partIdx) {
        return array.map(part, function (coords, coordIdx) {
          var location = geometry.getPoint(partIdx, coordIdx);
          var elevation = view.basemapTerrain.getElevation(location);

          // TODO: CURRENTLY ASSUMING SINGLE PART GEOMETRY...
          var prevLocation = geometry.getPoint(partIdx, (coordIdx > 0) ? (coordIdx - 1) : 0);
          distanceAlong += this._geodesicDistance(view, prevLocation, location);

          return [coords[0], coords[1], elevation, distanceAlong];
        }.bind(this));
      }.bind(this));
    },

    /**
     *
     * @param view
     * @param fromPoint
     * @param toPoint
     * @returns {Number}
     * @private
     */
    _geodesicDistance: function (view, fromPoint, toPoint) {
      var polyline = new Polyline(view.spatialReference);
      polyline.addPath([fromPoint, toPoint]);
      return geometryEngine.geodesicLength(polyline, "meters");
    },

    /**
     *
     * @param view
     * @param fromPoint
     * @param toPoint
     * @returns {Number}
     * @private
     */
    _planarDistance: function (view, fromPoint, toPoint) {
      return geometryEngine.distance(fromPoint, toPoint, "meters");
    },

    /**
     *
     * @param parts
     * @returns {{x,y,coords}[]}
     * @private
     */
    _getProfileInfos: function (parts) {
      var profile = [];
      array.forEach(parts, function (part) {
        array.forEach(part, function (coords, coordsIndex) {
          profile.push({
            y: (coords[2] || 0.0),         // Z //
            x: (coords[3] || coordsIndex), // M //
            coords: coords,
            index: coordsIndex
          });
        }.bind(this));
      }.bind(this));
      return profile;
    },

    /**
     *
     * @param profileInfos
     * @private
     */
    displayProfile: function (profileInfos) {

      if(!this.profileChart) {

        var fontColor = "#fff";
        var lineStroke = {color: "gold", width: 1};

        this.chartNode = put(this.view.container, "div.profile-chart-node");
        this.profileChart = new Chart(this.chartNode);
        this.profileChart.setTheme(ChartTheme);
        this.profileChart.fill = this.profileChart.theme.plotarea.fill = "transparent";


        this.profileChart.addAxis("x", {
          title: "Distance (m)",
          titleOrientation: "away",
          titleFontColor: fontColor,
          natural: true,
          includeZero: true,
          fixUpper: "none",
          minorTicks: false,
          majorTick: lineStroke,
          stroke: lineStroke,
          font: "normal normal 9pt Tahoma",
          fontColor: fontColor
        });

        this.profileChart.addAxis("y", {
          title: "Elevation (m)",
          titleFontColor: fontColor,
          vertical: true,
          fixUpper: "minor",
          includeZero: false,
          minorTicks: false,
          majorTick: lineStroke,
          stroke: lineStroke,
          font: "normal normal 9pt Tahoma",
          fontColor: fontColor
        });

        this.profileChart.addPlot("grid", {
          type: Grid,
          hMajorLines: true,
          hMinorLines: false,
          vMajorLines: false,
          vMinorLines: false,
          majorHLine: {
            color: "#ddd",
            width: 0.5
          }
        });

        this.profileChart.addPlot("default", {
          type: Areas,
          tension: "S",
          precision: 1
        });

        this.profileChart.addSeries("ElevationProfile", profileInfos, {
          stroke: {color: Color.named.gold, width: 3.0},
          fill: {
            type: "linear",
            space: "plot",
            x1: 50, y1: 0, x2: 50, y2: 100,
            colors: [
              {
                offset: 0.0,
                color: "#8B4513"
              },
              {
                offset: 1.0,
                color: "#CD853F"
              }
            ]
          }
        });

        var mouseIndicator = new MouseIndicator(this.profileChart, "default", {
          series: "ElevationProfile",
          mouseOver: true,
          fill: "#fff",
          font: "normal normal normal 11pt Tahoma",
          labelFunc: function (elevationInfo) {
            var details = {
              elev: elevationInfo.y.toFixed(1),
              dist: elevationInfo.x.toFixed(1)
            };
            return lang.replace("Elev: {elev} m -- Dist: {dist} m", details);
          }
        });

        this.profileChart.render();

        aspect.after(registry.getEnclosingWidget(this.chartNode), "resize", function () {
          this.profileChart.resize();
        }.bind(this), true);

      } else {
        this.profileChart.updateSeries("ElevationProfile", profileInfos);
        this.profileChart.render();
      }

    }

  });

  // VERSION //
  ElevationsProfileTool.version = "0.0.1";

  // CLASS //
  return ElevationsProfileTool;
});