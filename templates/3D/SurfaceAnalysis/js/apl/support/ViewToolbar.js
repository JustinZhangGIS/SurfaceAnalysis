/**
 *
 * MapToolbar
 *  - A toolbar to hold Map tools
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/4/2015 - 0.0.1 -
 * Modified:
 *
 */
define([
  "dojo/_base/declare",
  "dojo/aspect",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/dom-class",
  "put-selector/put",
  "dijit/registry",
  "dijit/Toolbar",
  "dijit/layout/StackContainer",
  "dijit/layout/StackController",
  "dijit/layout/ContentPane"
], function (declare, aspect, lang, array, domClass, put,
             registry, Toolbar, StackContainer, StackController, ContentPane) {


  var ViewToolbar = Toolbar.createSubclass({

    declaredClass: "ViewToolbar",

    // LABEL FOR THE DEFAULT CONTAINER //
    defaultContainerLabel: "Details and parameters for selected tool...",

    /**
     * CONSTRUCTOR
     */
    constructor: function (options) {
      declare.safeMixin(this, options);
    },

    /**
     *
     */
    postCreate: function () {
      this.inherited(arguments);
      domClass.add(this.domNode, "view-toolbar");
    },

    /**
     *
     */
    startup: function () {
      this.inherited(arguments);

      // STACK CONTAINER //
      this.container = new StackContainer({}, this.optionsPaneNodeId);
      this.container.startup();

      // DEFAULT PANE //
      this.defaultPane = new ContentPane({
        content: put("div.default-container-label", this.defaultContainerLabel)
      }, put("div.view-toolbar-container"));
      this.container.addChild(this.defaultPane);

      // TODO: USE TOPICS TO HANDLE TOGGLING OF TOOLS...
    },

    /**
     *
     * @param viewTool
     */
    addTool: function (viewTool) {

      var optionsPane = new ContentPane({});
      viewTool.set("optionsPane", optionsPane);
      this.container.addChild(optionsPane);

      // TODO: USE TOPICS TO HANDLE TOGGLING OF TOOLS...
      viewTool.on("click", function () {
        var checked = viewTool.get("checked");
        if(checked) {
          this.container.selectChild(optionsPane);
          array.forEach(this.getChildren(), function (childTool) {
            if(childTool.id !== viewTool.id) {
              childTool.set("checked", false);
            }
          }.bind(this));
        } else {
          var hasSelection = array.some(this.getChildren(), function (childTool) {
            return childTool.get("checked");
          }.bind(this));
          if(!hasSelection) {
            this.container.selectChild(this.defaultPane);
          }
        }
      }.bind(this));

      this.addChild(viewTool);
    }

  });

  // VERSION //
  ViewToolbar.version = "0.0.1";

  // RETURN CLASS //
  return ViewToolbar;
});
  


