/**
 *  LineOfSightTool Dijit
 *  - allows user to interactively display line-of-sight results based on elevations in the display
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "put-selector/put",
  "dojo/_base/Color",
  "dojo/colors",
  "dojo/on",
  "dojo/keys",
  "dojo/json",
  "dojo/dom",
  "dojo/dom-class",
  "esri/geometry/Polyline",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/LineSymbol3D",
  "esri/symbols/PathSymbol3DLayer",
  "esri/renderers/UniqueValueRenderer",
  "esri/layers/GraphicsLayer",
  "./support/ViewToggleButton",
  "./support/ViewToolParameters",
  "./support/draw/DrawLineTool"
], function (declare, lang, array, put, Color, colors, on, keys, json, dom, domClass,
             Polyline, geometryEngine, Graphic, SimpleLineSymbol, LineSymbol3D, PathSymbol3DLayer,
             UniqueValueRenderer, GraphicsLayer,
             ViewToggleButton, ViewToolParameters, DrawLineTool) {

  /**
   * LineOfSightTool DIJIT CLASS
   */
  var LineOfSightTool = ViewToggleButton.createSubclass({

    declaredClass: "LineOfSightTool",
    baseClass: "los-view-tool",
    iconClass: "los-view-tool-icon",

    hasOptions: true,

    /**
     * TODO: use i18n strings...
     */
    label: "Line-Of-Sight",
    title: "Line-Of-Sight Tool",
    description: "Mouse down on a location then move cursor to perform line-of-sight analysis",

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

      var losDefaultSymbol = new LineSymbol3D({
        symbolLayers: [
          new PathSymbol3DLayer({
            size: 25.0,
            material: {
              color: Color.named.gold
            }
          })
        ]
      });

      this.losLayer = new GraphicsLayer({
        id: "LOSLayer",
        hasZ: true,
        elevationInfo: {
          mode: "on-the-ground"
        },
        renderer: new UniqueValueRenderer({
          defaultSymbol: losDefaultSymbol,
          field: "visibility",
          uniqueValueInfos: [
            {
              value: -1,
              label: "Default",
              description: "This part of the line is unknown",
              symbol: losDefaultSymbol
            },
            {
              value: 0,
              label: "Not Visible",
              description: "This part of the line is not visible",
              symbol: new SimpleLineSymbol({
                color: Color.named.red,
                width: 5.0
              })
            },
            {
              value: 1,
              label: "Visible",
              description: "This part of the line is visible",
              symbol: new SimpleLineSymbol({
                color: Color.named.lime,
                width: 5.0
              })
            }
          ]
        })
      });
      this.view.map.add(this.losLayer);
    },

    /**
     *
     */
    initializeEvents: function () {
      // DRAW TOOL //
      this.drawTool = new DrawLineTool({ view: this.view });
      this.drawTool.on("update", function (evt) {
        if(evt.geometry) {
          this.updateDisplayGraphic(evt.geometry.clone());
          this.doAnalysis(evt.geometry.clone(), true);
        }
      }.bind(this));
      this.drawTool.on("complete", function (evt) {
        if(evt.geometry) {
          this.doAnalysis(evt.geometry.clone(), false);
          this.updateDisplayGraphic();
        }
      }.bind(this));
    },

    /**
     *
     */
    initParameterUI: function () {

      var numberConstraints = { min: 0.0, max: 100.0, places: 1 };

      var unitsOptions = [
        { label: "Meters", value: "Meters", selected: false },
        { label: "Kilometers", value: "Kilometers", selected: false },
        { label: "Feet", value: "Feet", selected: false },
        { label: "Yards", value: "Yards", selected: false },
        { label: "Miles", value: "Miles", selected: false }
      ];

      // PARAMETER LIST //
      var parametersList = [
        { parameter: "observerOffset", label: "Observer Offset", value: 2.0, canEdit: true, editorType: "Number", constraints: numberConstraints },
        { parameter: "ObserverOffsetUnits", label: "Observer Offset Units", value: "Meters", canEdit: false, editorType: "Choice", options: unitsOptions },
        { parameter: "TargetOffset", label: "Target Offset", value: 2.0, canEdit: true, editorType: "Number", constraints: numberConstraints },
        { parameter: "TargetOffsetUnits", label: "Target Offset Units", value: "Meters", canEdit: false, editorType: "Choice", options: unitsOptions }
      ];

      this.toolParameters = new ViewToolParameters({
        parametersList: parametersList,
        containerNode: this.optionsPane.containerNode
      });

    },

    /**
     * ENABLE TOOL
     *
     * @private
     */
    enable: function () {
      this.inherited(arguments);
      this.drawTool.activate();
      if(!this.toolParameters) {
        this.initParameterUI();
      }
    },

    /**
     *
     */
    disable: function () {
      this.inherited(arguments);
      this.drawTool.deactivate();
      if(this.losLayer) {
        this.losLayer.removeAll();
      }
    },

    /**
     *
     */
    updateDisplayGraphic: function (losPolyline) {

      if(this.losGraphic) {
        this.losLayer.remove(this.losGraphic);
        this.losGraphic = null;
      }

      if(losPolyline) {
        this.losGraphic = new Graphic({
          geometry: losPolyline,
          attributes: { "visibility": -1 }
        });
        this.losLayer.add(this.losGraphic);
      }

    },

    /**
     *
     * @param losPolyline
     * @param isTemporary
     */
    doAnalysis: function (losPolyline, isTemporary) {

      if(this.losVisibleGraphic) {
        this.losLayer.remove(this.losVisibleGraphic);
        this.losVisibleGraphic = null;
      }
      if(this.losNotVisibleGraphic) {
        this.losLayer.remove(this.losNotVisibleGraphic);
        this.losNotVisibleGraphic = null;
      }

      var losParameters = this.toolParameters.asAnalysisParameters();
      var losResults = this.getLineOfSight(
          this.view,
          losPolyline.getPoint(0, 0),
          losParameters.observerOffset,
          losPolyline.getPoint(0, 1),
          losParameters.targetOffset
      );

      if(losResults.visibleLines) {
        var losVisibleGraphic = new Graphic({
          geometry: losResults.visibleLines,
          attributes: { "visibility": 1 }
        });
        this.losLayer.add(losVisibleGraphic);
        if(isTemporary) {
          this.losVisibleGraphic = losVisibleGraphic;
        }
      }
      if(losResults.invisibleLines) {
        var losNotVisibleGraphic = new Graphic({
          geometry: losResults.invisibleLines,
          attributes: { "visibility": 0 }
        });
        this.losLayer.add(losNotVisibleGraphic);
        if(isTemporary) {
          this.losNotVisibleGraphic = losNotVisibleGraphic;
        }
      }
    },

    _getDistanceAndSlope: function (pnt1, pnt2) {
      /*...*/
    },

    /**
     * Returns a line-of-site indicator interpolated from the View based on an input polyline.
     *    Note: curvature and refraction parameters are ignored.
     *
     * @param view
     * @param observer
     * @param observerOffset
     * @param target
     * @param targetOffset
     * @returns {{isVisible: boolean, obstruction: *}}
     */
    getLineOfSight: function (view, observer, observerOffset, target, targetOffset) {
      //console.info("getLineOfSight ::: ", observer, observerOffset, target, targetOffset);

      var obstruction = null;

      var visibleGeomColl = new Polyline(view.spatialReference);
      visibleGeomColl.hasZ = true;
      var visiblePntColl = [];

      var invisibleGeomColl = new Polyline(view.spatialReference);
      invisibleGeomColl.hasZ = true;
      var invisiblePntColl = [];

      var observerElev = observer.z + (observerOffset || 1.0);
      var targetElev = target.z + (targetOffset || 1.0);
      var obsTarDistance = geometryEngine.distance(observer, target, "meters");
      var obsTarSlope = (targetElev - observerElev) / obsTarDistance;

      var userLineSimple = new Polyline(view.spatialReference);
      userLineSimple.addPath([observer, target]);
      var userLine = geometryEngine.densify(userLineSimple, 10.0, "meters");
      var thisPoint = userLine.getPoint(0, 0);
      var nextPoint = userLine.getPoint(0, 1);

      var currentElev = view.basemapTerrain.getElevation(nextPoint);
      var currentDist = geometryEngine.distance(thisPoint, nextPoint, "meters");
      var currentSlope = (currentElev - observerElev) / currentDist;

      var nextSlope = 0.0;
      var currentAbove = true;
      var blocked = false;

      for (var pntIndex = 2; pntIndex < userLine.paths[0].length; pntIndex++) {

        var currentPoint = userLine.getPoint(0, pntIndex);
        currentElev = view.basemapTerrain.getElevation(currentPoint);
        currentDist = geometryEngine.distance(observer, currentPoint, "meters");

        nextSlope = (currentElev - observerElev) / currentDist;
        if((!blocked) && (nextSlope > obsTarSlope)) {
          // THIS SHOULD NOT BE THE 'NEXT' POINT BUT THE 'RAY/SURFACE INTERSECTION' LOCATION INSTEAD...
          obstruction = nextPoint.clone();
          obstruction.z = view.basemapTerrain.getElevation(obstruction);
          blocked = true;
        }

        if(nextSlope > currentSlope) {
          currentSlope = nextSlope;
          if(!currentAbove) {
            currentAbove = true;

            if(invisiblePntColl.length > 0) {
              invisiblePntColl.push(nextPoint.clone());
              invisibleGeomColl.addPath(invisiblePntColl);
              invisiblePntColl = [];
            }

          } else {
            visiblePntColl.push(nextPoint.clone());
            nextPoint = currentPoint.clone();
          }
        } else {
          if(currentAbove) {
            currentAbove = false;

            if(visiblePntColl.length > 0) {
              visiblePntColl.push(nextPoint.clone());
              visibleGeomColl.addPath(visiblePntColl);
              visiblePntColl = [];
            }

          } else {
            invisiblePntColl.push(nextPoint.clone());
            nextPoint = currentPoint.clone();
          }
        }
        //console.info(pntIndex, visibleGeomColl.paths.length, invisibleGeomColl.paths.length);
      }

      if(currentAbove) {
        if(visiblePntColl.length > 0) {
          visiblePntColl.push(nextPoint.clone());
          visibleGeomColl.addPath(visiblePntColl);
        }
      } else {
        if(invisiblePntColl.length > 0) {
          invisiblePntColl.push(nextPoint.clone());
          invisibleGeomColl.addPath(invisiblePntColl);
        }
      }

      // SET OUT PARAMETERS
      var losResults = {
        isVisible: !blocked,
        obstruction: obstruction
      };
      if(visibleGeomColl.paths.length > 0) {
        losResults.visibleLines = visibleGeomColl;
      }
      if(invisibleGeomColl.paths.length > 0) {
        losResults.invisibleLines = invisibleGeomColl;
      }

      return losResults;
    }

  });

  // VERSION //
  LineOfSightTool.version = "0.0.1";

  // CLASS //
  return LineOfSightTool;
});