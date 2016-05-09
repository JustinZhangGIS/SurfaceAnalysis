/*global define,document */
/*jslint sloppy:true,nomen:true */
/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/_base/Color",
    "dojo/colors",
    "dojo/Deferred",
    "dojo/query",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-class",
    "put-selector/put",
    "dstore/Memory",
    "dstore/Trackable",
    "dgrid/List",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/extensions/DijitRegistry",
    "dijit/registry",
    "esri/core/watchUtils",
    "esri/Map",
    "esri/WebScene",
    "esri/portal/PortalItem",
    "esri/views/MapView",
    "esri/views/SceneView",
    "esri/Camera",
    "esri/widgets/Home",
    "esri/widgets/Search",
    "esri/widgets/Search/SearchViewModel",
    "esri/widgets/BasemapToggle",
    "esri/widgets/BasemapToggle/BasemapToggleViewModel",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/layers/FeatureLayer",
    "esri/renderers/SimpleRenderer",
    "esri/geometry/Point",
    "esri/symbols/PointSymbol3D",
    "esri/symbols/ObjectSymbol3DLayer",
    "esri/layers/support/LabelClass",
    "esri/symbols/Font",
    "esri/symbols/TextSymbol",
    "./apl/support/ViewToolbar",
    "./apl/SceneFlyTool",
    "./apl/ViewshedTool",
    "./apl/LineOfSightTool",
    "./apl/ElevationsProfileTool"
], function (declare, lang, array, Color, colors, Deferred, query, on, dom, domClass, put,
             Memory, Trackable, List, OnDemandGrid, Selection, DijitRegistry, registry,
             watchUtils, Map, WebScene, PortalItem, MapView, SceneView, Camera,
             Home, Search, SearchViewModel, BasemapToggle, BasemapToggleViewModel,
             Graphic, GraphicsLayer, FeatureLayer, SimpleRenderer, Point, PointSymbol3D, ObjectSymbol3DLayer, LabelClass, Font, TextSymbol,
             ViewToolbar, SceneFlyTool, ViewshedTool, LineOfSightTool, ElevationsProfileTool) {

    /**
     * MAIN APPLICATION
     */
    var MainApp = declare(null, {

        /**
         * CONSTRUCTOR
         *
         * @param config
         */
        constructor: function (config) {
            declare.safeMixin(this, config);
        },

        /**
         * STARTUP
         */
        startup: function () {
            var itemIdOrItemInfo = (this.webscene || this.webmap || this.itemInfo);
            if(itemIdOrItemInfo) {
                this.initializeMap(itemIdOrItemInfo);
            } else {
                MainApp.displayMessage(new Error("itemInfo, webmap, or webscene parameter not defined"));
            }
        },

        /**
         * INITIALIZE THE MAP
         *
         * @param webSceneItemId
         */
        initializeMap: function (webSceneItemId) {

            // PORTAL ITEM //
            var portalIem = new PortalItem({ id: webSceneItemId });
            // WEBSCENE //
            var webScene = new WebScene({ portalItem: portalIem });

            // SCENE VIEW //
            this.sceneView = new SceneView({
                container: "scene-node",
                map: webScene
            });
            this.sceneView.then(function () {
                this._whenFinishedUpdatingOnce(this.sceneView).then(function () {

                    // INITIALIZE BASEMAP TOGGLE //
                    this.initializeBasemapToggle(this.sceneView);

                    // INITIALIZE HOME BUTTON //
                    this.initializeHomeButton(this.sceneView);

                    // INITIALIZE SEARCH //
                    this.initializeSearch(this.sceneView);

                    // LOAD SLIDES //
                    this.initializeSlidesPane(this.sceneView);

                    // OTHER CODE HERE
                    this.otherCodeGoesHere();

                    // CLEAR WELCOME MESSAGE //
                    MainApp.displayMessage();

                }.bind(this), MainApp.displayMessage);
            }.bind(this), MainApp.displayMessage);

        },

        /**
         *
         * @param view
         * @returns {Promise}
         * @private
         */
        _whenFinishedUpdatingOnce: function (view) {
            return watchUtils.whenTrueOnce(view, "updating").then(function () {
                return watchUtils.whenFalseOnce(view, "updating");
            }.bind(this), console.warn);
        },

        /**
         *
         * @param view
         */
        initializeBasemapToggle: function (view) {
            // BASEMAP TOGGLE //
            var basemapToggle = new BasemapToggle({
                viewModel: {
                    view: view,
                    secondaryBasemap: "national-geographic"
                }
            });
            basemapToggle.startup();
            view.ui.add(basemapToggle, { position: "top-left", index: 0 });
        },

        /**
         *
         * @param view
         */
        initializeHomeButton: function (view) {
            // HOME BUTTON //
            var homeBtn = new Home({
                viewModel: {
                    view: view
                }
            });
            homeBtn.startup();
            view.ui.add(homeBtn, { position: "top-left", index: 2 });
        },

        /**
         *
         */
        initializeSearch: function (view) {
            /**
             * SEARCH
             *
             * http://jscore.esri.com/javascript/4/api-reference/esri-widgets-Search.html
             * http://jscore.esri.com/javascript/4/api-reference/esri-widgets-Search-SearchViewModel.html
             * https://developers.arcgis.com/rest/geocode/api-reference/geocoding-category-filtering.htm
             * https://developers.arcgis.com/rest/geocode/api-reference/geocode-coverage.htm
             */
            var search = new Search({
                viewModel: {
                    view: view,
                    autoNavigate: true,
                    autoSelect: true,
                    highlightEnabled: true,
                    labelEnabled: false,
                    popupEnabled: false,
                    showPopupOnSelect: false
                }
            });
            search.startup();
            view.ui.add(search, "top-right");
        },

        /**
         *
         * @param view
         */
        initializeSlidesPane: function (view) {

            /*
             baseMap {elevationLayers,baseLayers,referenceLayers}
             id
             title {text}
             description {text}
             thumbnail {url}
             viewpoint {camera}
             visibleLayers [{id}]
             */


            // SLIDES PANE //
            this.slidesPane = registry.byId("slides-pane");

            // PRESENTATION SLIDES //
            var slides = view.map.presentation ? view.map.presentation.slides : null;

            // DO WE HAVE SLIDES //
            if(slides && (slides.length > 0)) {
                // UPDATE SLIDES COUNT //
                this.slidesPane.set("title", lang.replace("Slides ({length})", slides));

                // SLIDES LIST //
                this.slidesList = new (declare([List, Selection, DijitRegistry]))({
                    className: "dgrid-autoheight",
                    renderRow: this.renderSlideNode.bind(this)
                }, put(this.slidesPane.containerNode, "div"));
                this.slidesList.startup();

                // RENDER SLIDES //
                this.slidesList.renderArray(slides.items);

                // DISABLE SLIDES WHILE VIEW IS UPDATING //
                view.watch("updating", function (isUpdating) {
                    this.slidesPane.set("disabled", isUpdating);
                }.bind(this));

                // ...SIGH... DON'T CHANGE VISIBILITY OF LAYERS THAT WERE *NOT* PART OF THE WEBSCENE //
                view.on("layerview-create", function (evt) {
                    slides.forEach(function (slide) {
                        slide.visibleLayers.add({ id: evt.layer.id });
                    }.bind(this));
                }.bind(this));

            } else {
                // NO SLIDES IN PRESENTATION //
                put(this.slidesPane.containerNode, "div.no-data-message", "No slides in this map")
            }
        },

        /**
         *
         * @param slide
         * @returns {*}
         */
        renderSlideNode: function (slide) {

            var slideNode = put("div.slide-item");
            put(slideNode, "div.slide-title", slide.title.text);
            put(slideNode, "div.slide-thumb img", { src: slide.thumbnail.url });

            on(slideNode, "click", function () {
                slide.applyTo(this.sceneView, { animate: true });
            }.bind(this));

            return slideNode;
        },

        /**
         *
         */
        otherCodeGoesHere: function () {

            // VIEW TOOLBAR //
            var viewToolbar = new ViewToolbar({
                optionsPaneNodeId: "view-tools-options-pane"
            }, "view-tools-pane");
            viewToolbar.startup();

            // SCENE FLY TOOL  //
            this.flyTool = new SceneFlyTool({ view: this.sceneView });
            viewToolbar.addTool(this.flyTool);

            // VIEWSHED TOOL //
            this.viewshedTool = new ViewshedTool({ view: this.sceneView });
            viewToolbar.addTool(this.viewshedTool);

            // ELEVATIONS PROFILE TOOL //
            this.profileTool = new ElevationsProfileTool({ view: this.sceneView });
            viewToolbar.addTool(this.profileTool);

            // LINE-OF-SIGHT TOOL //
            this.lineOfSightTool = new LineOfSightTool({ view: this.sceneView });
            viewToolbar.addTool(this.lineOfSightTool);

        }

    });

    /**
     *  DISPLAY MESSAGE OR ERROR
     *
     * @param messageOrError {string | Error}
     * @param smallText {boolean}
     */
    MainApp.displayMessage = function (messageOrError, smallText) {
        require(["dojo/query", "put-selector/put"], function (query, put) {
            query(".message-node").orphan();
            if(messageOrError) {
                if(messageOrError instanceof Error) {
                    put(document.body, "div.message-node.error-node span", messageOrError.message);
                } else {
                    if(messageOrError.declaredClass === "esri.tasks.GPMessage") {
                        var simpleMessage = messageOrError.description;
                        put(document.body, "div.message-node span.esriJobMessage.$ span.small-text $", messageOrError.type, simpleMessage);
                    } else {
                        put(document.body, smallText ? "div.message-node span.small-text" : "div.message-node span", messageOrError);
                    }
                }
            }
        });
    };

    MainApp.version = "0.0.1";

    return MainApp;
});