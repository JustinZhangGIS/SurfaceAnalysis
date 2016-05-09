/**
 *  Viewshed Dijit
 *  - allows user to interactively display an viewshed
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/Color",
  "dojo/colors",
  "dojo/on",
  "dojo/aspect",
  "dojo/keys",
  "dojo/json",
  "dojo/dom",
  "dojo/dom-class",
  "esri/identity/IdentityManager",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Polygon",
  "esri/geometry/Circle",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/support/LabelClass",
  "esri/symbols/TextSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/PointSymbol3D",
  "esri/symbols/ObjectSymbol3DLayer",
  "esri/symbols/LineSymbol3D",
  "esri/symbols/LineSymbol3DLayer",
  "esri/symbols/PolygonSymbol3D",
  "esri/symbols/FillSymbol3DLayer",
  "esri/symbols/PathSymbol3DLayer",
  "esri/tasks/support/FeatureSet",
  "esri/tasks/Geoprocessor",
  "esri/tasks/support/JobInfo",
  "esri/tasks/support/GPMessage",
  "dstore/Memory",
  "dstore/Trackable",
  "dgrid/OnDemandGrid",
  "dgrid/Selection",
  "dgrid/extensions/DijitRegistry",
  "put-selector/put",
  "dijit/registry",
  "dijit/form/ToggleButton",
  "dijit/layout/ContentPane",
  "dijit/ConfirmDialog",
  "./support/ViewToggleButton",
  "./support/ViewToolParameters",
  "./support/draw/DrawPointTool"
], function (declare, lang, array, Color, colors, on, aspect, keys, json, dom, domClass,
             IdentityManager, Point, Polyline, Polygon, Circle, geometryEngine, Graphic, GraphicsLayer, FeatureLayer,
             LabelClass, TextSymbol, SimpleRenderer, PointSymbol3D, ObjectSymbol3DLayer,
             LineSymbol3D, LineSymbol3DLayer, PolygonSymbol3D, FillSymbol3DLayer, PathSymbol3DLayer,
             FeatureSet, Geoprocessor, JobInfo, GPMessage,
             Memory, Trackable, OnDemandGrid, Selection, DijitRegistry, put,
             registry, ToggleButton, ContentPane, ConfirmDialog,
             ViewToggleButton, ViewToolParameters, DrawPointTool) {

  /**
   * Viewshed DIJIT CLASS
   */
  var ViewshedTool = ViewToggleButton.createSubclass({

    declaredClass: "ViewshedTool",
    baseClass: "viewshed-view-tool",
    iconClass: "viewshed-view-tool-icon",

    hasOptions: true,

    viewshedServiceUrl: "//elevation.arcgis.com/arcgis/rest/services/Tools/Elevation/GPServer/Viewshed",


    /**
     * TODO: use i18n strings...
     */
    label: "Viewshed",
    title: "Viewshed Tool",
    description: "Click on a map location to create an viewshed",

    /**
     * STARTUP
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
    initParameterUI: function () {

      var numberConstraints = { min: 0.0, max: 50000.0, places: 1 };

      var resolutionOptions = [
        { label: "FINEST", value: "FINEST", selected: false },
        { label: "10m", value: "10m", selected: false },
        { label: "30m", value: "30m", selected: false },
        { label: "90m", value: "90m", selected: false }
      ];

      var unitsOptions = [
        { label: "meters", value: "Meters", selected: false },
        { label: "kilometers", value: "Kilometers", selected: false },
        { label: "feet", value: "Feet", selected: false },
        { label: "yards", value: "Yards", selected: false },
        { label: "miles", value: "Miles", selected: false }
      ];

      // PARAMETER LIST //
      var parametersList = [
        //{parameter: "InputPoints", label: "Input Points", value: "No Points", canEdit: false},
        { parameter: "MaximumDistance", label: "Maximum Distance", value: 2500, canEdit: true, editorType: "Number", constraints: numberConstraints },
        { parameter: "MaximumDistanceUnits", label: "Maximum Distance Units", value: "meters", canEdit: true, editorType: "Choice", options: unitsOptions },
        { parameter: "DEMResolution", label: "DEM Resolution", value: "FINEST", canEdit: true, editorType: "Choice", options: resolutionOptions },
        { parameter: "ObserverHeight", label: "Observer Height", value: 2.0, canEdit: true, editorType: "Number", constraints: numberConstraints },
        { parameter: "ObserverHeightUnits", label: "Observer Height Units", value: "meters", canEdit: true, editorType: "Choice", options: unitsOptions },
        { parameter: "SurfaceOffset", label: "Surface Offset", value: 0.0, canEdit: true, editorType: "Number", constraints: numberConstraints },
        { parameter: "SurfaceOffsetUnits", label: "Surface Offset Units", value: "meters", canEdit: true, editorType: "Choice", options: unitsOptions },
        { parameter: "GeneralizeViewshedPolygons", label: "Generalize Polygons", value: true, canEdit: true, editorType: "Boolean" }
      ];

      this.toolParameters = new ViewToolParameters({
        parametersList: parametersList,
        containerNode: this.optionsPane.containerNode
      });
      this.toolParameters.on("update", function () {
        this.doAnalysis();
      }.bind(this));

      // RESULTS LABEL //
      this.resultsInfoLabel = put(this.optionsPane.containerNode, "div.results-label");
    },

    /**
     *
     */
    initializeLayer: function () {

      this.userLocationLayer = new GraphicsLayer({
        id: "userLocationLayer",
        spatialReference: this.view.spatialReference,
        renderer: new SimpleRenderer({
          symbol: new PointSymbol3D({
            "symbolLayers": [
              new ObjectSymbol3DLayer({
                "width": 50.0,
                "height": 500.0,
                "resource": {
                  "primitive": "cylinder"
                },
                "material": {
                  "color": Color.named.dodgerblue
                }
              })
            ]
          })
        })//,
        /*
         showLabels: true,
         labelingInfo: [
         new LabelClass({
         labelExpression: "[name]",
         labelPlacement: "always-horizontal",
         symbol: new TextSymbol({
         font: {
         style: "normal",
         variant: "normal",
         weight: "bold",
         size: 25,
         family: "Helvetica",
         decoration: "none"
         },
         color: Color.named.dodgerblue
         }).toJSON()
         })
         ]
         */
      });
      this.view.map.add(this.userLocationLayer);


      this.viewshedResultsLayer = new GraphicsLayer({
        id: "viewshedResultsLayer",
        elevationInfo: {
          mode: "on-the-ground"
        },
        spatialReference: this.view.spatialReference,
        renderer: new SimpleRenderer({
          symbol: new PolygonSymbol3D({
            "symbolLayers": [
              new FillSymbol3DLayer({
                "material": {
                  "color": Color.named.lime.concat(0.5)
                }
              }),
              new LineSymbol3DLayer({
                "size": 2.5,
                "material": {
                  "color": Color.named.lightgreen
                }
              })
            ]
          })
        })
      });
      this.view.map.add(this.viewshedResultsLayer);


      this.viewshedDistanceLayer = new GraphicsLayer({
        id: "viewshedDistanceLayer",
        elevationInfo: {
          mode: "on-the-ground"
        },
        spatialReference: this.view.spatialReference,
        renderer: new SimpleRenderer({
          symbol: new PolygonSymbol3D({
            "symbolLayers": [
              new FillSymbol3DLayer({
                "material": {
                  "color": Color.named.white.concat(0.2)
                }
              }),
              new LineSymbol3DLayer({
                "size": 3,
                "material": {
                  "color": Color.named.red
                }
              })
            ]
          })
        })
      });
      this.view.map.add(this.viewshedDistanceLayer);
    },

    /**
     *
     */
    initializeEvents: function () {

      // DRAW TOOL //
      this.drawTool = new DrawPointTool({ view: this.view });
      this.drawTool.on("complete", function (evt) {
        if(evt.geometry) {
          this.observerLocation = evt.geometry;

          this.userLocationLayer.removeAll();
          this.userLocationLayer.add(new Graphic(this.observerLocation, null, { name: "Observer" }));

          this.doAnalysis();
        }
      }.bind(this));

    },

    /**
     *
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
      // CLEAR PREVIOUS RESULTS //
      this.viewshedResultsLayer.removeAll();
      this.viewshedDistanceLayer.removeAll();
      this.userLocationLayer.removeAll();
      this.resultsInfoLabel.innerHTML = "";
    },

    /**
     *
     */
    doAnalysis: function () {

      if(this.observerLocation) {

        // ANALYSIS LOCATION //
        //   NOTE: DO NOT INCLUDE Z AS THE VIEWSHED SERVICE
        //         DOES NOT LIKE IT WHEN LOCATIONS HAVE Zs...
        var analysisLocation = new Point({
          x: this.observerLocation.x,
          y: this.observerLocation.y,
          hasZ: false,
          spatialReference: this.view.spatialReference
        });

        // CLEAR PREVIOUS RESULTS //
        this.viewshedDistanceLayer.removeAll();
        this.viewshedResultsLayer.removeAll();
        this.resultsInfoLabel.innerHTML = "";

        // INPUT FEATURES //
        var inputLocationsFeatureSet = new FeatureSet({
          features: [
            new Graphic({
              geometry: analysisLocation,
              attributes: { OID: 1 }
            })
          ],
          fields: [
            {
              "name": "OID",
              "type": "esriFieldTypeObjectID",
              "alias": "OID"
            }
          ]
        });

        var viewshedParameters = this.toolParameters.asAnalysisParameters();
        viewshedParameters.InputPoints = inputLocationsFeatureSet;

        // MAXIMUM DISTANCE //
        this.maxDistanceCircle = new Circle({
          center: analysisLocation,
          geodesic: true,
          numberOfPoints: 360,
          radius: viewshedParameters.MaximumDistance,
          radiusUnit: "meters"
        });
        var maxDistanceGraphic = new Graphic({
          geometry: this.maxDistanceCircle,
          attributes: { MAX_DISTANCE: viewshedParameters.MaximumDistance }
        });
        this.viewshedDistanceLayer.add(maxDistanceGraphic);

        this.setMapCursor("wait");


        // VIEWSHED TASK //
        var viewshedService = new Geoprocessor(this.viewshedServiceUrl);
        viewshedService.set("outSpatialReference", this.view.spatialReference);

        // CANCEL PREVIOUS //
        if(this.taskHandle && (!this.taskHandle.isFulfilled())) {
          this.taskHandle.cancel();
        }
        // SUBMIT //
        this.taskHandle = viewshedService.submitJob(viewshedParameters).then(function (jobInfo) {

          // JOB SUCCEEDED //
          if(jobInfo.jobStatus === "job-succeeded") {
            // GET VIEWSHED RESULTS //
            viewshedService.getResultData(jobInfo.jobId, "OutputViewshed").then(function (parameterValue) {
              // VIEWSHED FEATURES //
              var viewshedFeatureSet = parameterValue.value;

              // ADD TO VIEWSHED RESULTS LAYER //
              this.viewshedResultsLayer.addMany(viewshedFeatureSet.features);

              // DISPLAY DEM RESOLUTION DETAILS //
              var resultsAttributes = viewshedFeatureSet.features[0].attributes;
              this.demResolution = resultsAttributes.DEMResolution;
              put(this.resultsInfoLabel, "span", {
                innerHTML: lang.replace("{DEMResolution} resolution from <a href='{Source_URL}' target='_blank'>{ProductName}</a> by {Source}", resultsAttributes)
              });

              this.setMapCursor(this.mapActionCursor);
            }.bind(this), function (error) {
              console.warn(error);
              this.setMapCursor(this.mapActionCursor);
            }.bind(this));

          } else {
            console.warn(jobInfo);
            this.setMapCursor(this.mapActionCursor);
          }
        }.bind(this), function (error) {
          console.warn(error);
          this.setMapCursor(this.mapActionCursor);
        }.bind(this), function (jobInfo) {
          //console.info(jobInfo);
          this.setMapCursor(this.mapActionCursor);
          // TO CANCEL SPECIFIC JOB...
          //viewshedService.cancelJob(jobInfo.jobId);

        }.bind(this));

      }
    }

  });

  // VERSION //
  ViewshedTool.version = "0.0.1";

  // CLASS //
  return ViewshedTool;
});