/**
 *  ViewToggleButton Dijit
 *  - allows user to interact with the View
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
  "dijit/form/ToggleButton"
], function (declare, lang, array, put, Color, colors, on, keys, json, dom, domClass, ToggleButton) {

  /**
   * ViewToggleButton
   */
  var ViewToggleButton = ToggleButton.createSubclass({

    declaredClass: "ViewToggleButton",
    _baseClass: "view-toggle-button",
    iconClass: "view-toggle-button-icon",

    hasOptions: false,

    mapActionCursor: "crosshair",

    /**
     * TODO: use i18n strings...
     */
    label: "View ToggleButton",
    title: "View ToggleButton",
    description: "Tool to interact with the View",
    invalidConstructorParameterMessage: "A valid esri/views/SceneView object must be passed in as the 'view' parameter to the class constructor.",

    /**
     * CONSTRUCTOR
     */
    constructor: function (args) {
      declare.safeMixin(this, args);
    },

    /**
     *
     */
    postCreate: function () {
      this.inherited(arguments);
      this.domNode.title = this.title;
      domClass.add(this.domNode, this._baseClass);
      domClass.add(this.domNode, this.baseClass);
    },

    /**
     * STARTUP
     */
    startup: function () {
      this.inherited(arguments);
      this.validView = (this.view && (this.view.type === "3d"));
      if(this.validView) {
        this.initializeEvents();
      } else {
        this.destroy();
        throw new Error(this.invalidConstructorParameterMessage);
      }
    },

    /**
     *
     * @param optionsPane
     * @private
     */
    _setOptionsPaneAttr: function (optionsPane) {
      this.optionsPane = optionsPane;
      domClass.add(this.optionsPane.domNode, this.baseClass + "-options-pane");
      put(this.optionsPane.containerNode, "div.view-toggle-button-description", this.description);
    },

    /**
     * DIJIT TOGGLE ENABLED STATE
     *
     * @param checked
     */
    onChange: function (checked) {
      this.inherited(arguments);
      if(checked) {
        this.setMapCursor(this.mapActionCursor);
        this.enable();
      } else {
        this.setMapCursor();
        this.disable();
      }
    },

    /**
     * SET MAP CURSOR
     *
     * @param cursor
     * @private
     */
    setMapCursor: function (cursor) {
      this.view.container.style.cursor = (cursor || "default");
    },

    /**
     * DESTROY TOOL
     */
    destroy: function () {
      this.inherited(arguments);
    }

  });

  // VERSION //
  ViewToggleButton.version = "0.0.1";

  // CLASS //
  return ViewToggleButton;
});