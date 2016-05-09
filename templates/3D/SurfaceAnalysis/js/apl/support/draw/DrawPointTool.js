/**
 *
 * DrawPointTool
 *  - Draw a point on the View
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  2/19/2016 - 0.0.1 -
 * Modified:
 *
 */
define([
  "dojo/_base/declare",
  "dojo/on",
  "./DrawTool"
], function (declare, on, DrawTool) {

  // CLASS //
  var DrawPointTool = DrawTool.createSubclass({

    // CLASS NAME //
    declaredClass: "DrawPointTool",

    /**
     * CONSTRUCTOR
     */
    constructor: function (options) {
      declare.safeMixin(this, options);
    },

    /**
     *
     */
    activate: function () {
      if(this.clickHandle) {
        this.clickHandle.resume();
      } else {
        this.clickHandle = on.pausable(this.view, "click", function (evt) {
          this.emit("complete", {geometry: evt.mapPoint});
        }.bind(this));
        this.registerEvent(this.clickHandle);
      }
    },

    /**
     *
     */
    deactivate: function () {
      if(this.clickHandle) {
        this.clickHandle.pause();
      }
    }

  });

  // VERSION //
  DrawPointTool.version = "0.0.1";

  // RETURN CLASS //
  return DrawPointTool;
});
  

