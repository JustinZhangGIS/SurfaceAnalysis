/**
 *
 * DrawTool
 *  - A View draw tool
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  2/22/2016 - 0.0.1 -
 * Modified:
 *
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/Evented",
  "dojo/_base/array"
], function (declare, lang, Evented, array) {

  // CLASS //
  var DrawTool = declare([Evented], {

    // CLASS NAME //
    declaredClass: "DrawTool",

    /**
     * CONSTRUCTOR
     */
    constructor: function (options) {
      declare.safeMixin(this, options);

      // ALL EVENTS //
      this._events = [];

      // NAVIGATION CONTROLS //
      this._defaultNavControls = lang.clone(this.view.navigationControls);

      // SUSPEND NAVIGATION CONTROLS //
      this._suspendNavControls = {
        mouseClick: "",
        mouseClickDouble: "",
        mouseDragLeft: "",
        mouseDragMiddle: "",
        mouseDragRight: "",
        mouseWheel: ""
      };

      // SUSPEND DOUBLE CLICK CONTROLS //
      this._suspendDoubleClickControls = lang.mixin({}, this._defaultNavControls, {
        mouseClickDouble: ""
      });
    },

    /**
     *
     * @private
     */
    disableMapNavigation: function () {
      this.view.navigationController.setControls(this._suspendNavControls);
    },

    /**
     *
     */
    disableDoubleClick: function () {
      this.view.navigationController.setControls(this._suspendDoubleClickControls);
    },

    /**
     *
     * @private
     */
    enableMapNavigation: function () {
      this.view.navigationController.setControls(this._defaultNavControls);
    },

    /**
     * ALL EVENTS ON THE VIEW'S CONTAINER MUST BE
     * ADJUSTED BEFORE CALLING toMap()...
     *
     * @param evt
     * @returns {Point}
     * @private
     */
    toMapPoint: function (evt) {
      var adjustedX = (evt.clientX - this.view.position[0]);
      var adjustedY = (evt.clientY - this.view.position[1]);
      return this.view.toMap(adjustedX, adjustedY);
    },

    /**
     *
     * @param event
     */
    registerEvent: function (event) {
      this._events.push(event);
    },

    /**
     *
     */
    destroy: function () {
      array.forEach(this._events, function (event) {
        event.remove();
      }.bind(this));
    }

  });

  // VERSION //
  DrawTool.version = "0.0.1";

  // RETURN CLASS //
  return DrawTool;
});
  

