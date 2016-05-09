/**
 *
 * DrawLineTool
 *  - Draw a line on the View
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  2/19/2016 - 0.0.1 -
 * Modified:
 *
 */
define([
  "dojo/_base/declare",
  "dojo/on",
  "dojo/_base/lang",
  "esri/geometry/Polyline",
  "./DrawTool"
], function (declare, on, lang, Polyline, DrawTool) {

  // CLASS //
  var DrawLineTool = DrawTool.createSubclass({

    // CLASS NAME //
    declaredClass: "DrawLineTool",

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

      if(!this._geometry) {
        this._geometry = new Polyline(this.view.spatialReference);
      }

      if(this.clickHandle) {
        this.clickHandle.resume();
      } else {
        this.clickHandle = on.pausable(this.view.container, "mousedown", function (evt) {
          this.disableMapNavigation();

          var movePoint = this.toMapPoint(evt);
          this._geometry.addPath([movePoint, movePoint]);

          if(this.mouseMoveHandle) {
            this.mouseMoveHandle.resume();
          } else {
            this.mouseMoveHandle = on.pausable(this.view.container, "mousemove", function (evt) {
              var movePoint = this.toMapPoint(evt);
              if(movePoint) {
                this._geometry.setPoint(0, 1, movePoint);
                this.emit("update", {geometry: this._geometry.clone()});
              }
            }.bind(this));
            this.registerEvent(this.mouseMoveHandle);
          }

          on.once(this.view.container, "mouseup", function () {
            if(this.mouseMoveHandle) {
              this.mouseMoveHandle.pause();
            }

            this.emit("complete", {geometry: this._geometry.clone()});
            this._geometry.removePath(0);

            this.enableMapNavigation();
          }.bind(this));

        }.bind(this));
        this.registerEvent(this.clickHandle);
      }
    },

    /**
     *
     */
    deactivate: function () {
      if(this.mouseMoveHandle) {
        this.mouseMoveHandle.pause();
      }
      if(this.clickHandle) {
        this.clickHandle.pause();
      }
    }

  });

  // VERSION //
  DrawLineTool.version = "0.0.1";

  // RETURN CLASS //
  return DrawLineTool;
});
  

