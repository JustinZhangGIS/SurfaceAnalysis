/**
 *
 * DrawPolylineTool
 *  - Draw a polyline on the View
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  2/19/2016 - 0.0.1 -
 * Modified:
 *
 */
define([
  "dojo/_base/declare",
  "dojo/on",
  "esri/geometry/Polyline",
  "./DrawTool"
], function (declare, on, Polyline, DrawTool) {

  // CLASS //
  var DrawPolylineTool = DrawTool.createSubclass({

    // CLASS NAME //
    declaredClass: "DrawPolylineTool",

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

      // DISABLE DOUBLE CLICK //
      this.disableDoubleClick();

      if(!this._geometry) {
        this._geometry = new Polyline(this.view.spatialReference);
      }

      if(this.clickHandle) {
        this.clickHandle.resume();
      } else {
        this.clickHandle = on.pausable(this.view, "click", function (evt) {

          var pathsCount = this._geometry.paths.length;
          if(pathsCount === 0) {
            this._geometry.addPath([evt.mapPoint, evt.mapPoint]);

            if(this.mouseMoveHandle) {
              this.mouseMoveHandle.resume();
            } else {
              this.mouseMoveHandle = on.pausable(this.view.container, "mousemove", function (evt) {
                var movePoint = this.toMapPoint(evt);
                if(movePoint) {
                  this._geometry.setPoint(0, (this._geometry.paths[0].length - 1), movePoint);
                  this.emit("update", { geometry: this._geometry.clone() });
                }
              }.bind(this));
              this.registerEvent(this.mouseMoveHandle);
            }

            on.once(this.view.container, "dblclick", function () {
              this.mouseMoveHandle.pause();
              this.emit("complete", { geometry: this._geometry.clone() });
              this._geometry.removePath(0);
            }.bind(this));

          } else {
            this._geometry.insertPoint(0, this._geometry.paths[0].length, evt.mapPoint);
          }
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

      // ENABLE NAVIGATION //
      this.enableMapNavigation();
    }

  });

  // VERSION //
  DrawPolylineTool.version = "0.0.1";

  // RETURN CLASS //
  return DrawPolylineTool;
});
  

