/**
 *  SceneFlyTool Dijit
 *  - allows user to fly around in a Scene by pointing the mouse cursor in the desired direction
 */
define([
  "require",
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "put-selector/put",
  "dojo/on",
  "dojo/keys",
  "dojo/json",
  "dojo/dom",
  "dojo/dom-class",
  "esri/geometry/geometryEngine",
  "./support/ViewToggleButton"
], function (require, declare, lang, array, put, on, keys, json, dom, domClass, geometryEngine,
             ViewToggleButton) {

  /**
   * SceneFlyTool DIJIT CLASS
   */
  var SceneFlyTool = ViewToggleButton.createSubclass({

    declaredClass: "SceneFlyTool",
    baseClass: "sceneFly-view-tool",
    iconClass: "sceneFly-view-tool-icon",

    hasOptions: true,

    /**
     * TODO: use i18n strings...
     */
    label: "Fly",
    title: "Toggle Fly Tool",
    description: "Fly by clicking on the view and pointing the mouse in the desired direction",


    /**
     * MOVE CURSORS
     */
    cursors: {
      flying: lang.replace("url('{0}'),auto", [require.toUrl("./images/3DFlyTool32.cur")]),
      paused: lang.replace("url('{0}'),auto", [require.toUrl("./images/3DFlyTool32_gray.cur")])
    },

    /**
     * OFFSETS WHILE MOVING
     */
    MOVE_SPEED: {
      STOPPED: {PIXELS: 2, FACTOR: 0.00},
      SLOW: {PIXELS: 2, FACTOR: 0.03},
      MEDIUM: {PIXELS: 4, FACTOR: 0.06},
      FAST: {PIXELS: 8, FACTOR: 0.09}
    },

    /**
     * CONSTRUCTOR
     */
    constructor: function (args) {
      declare.safeMixin(this, args);

      /**
       * ARE WE CURRENTLY FLYING?
       */
      this._flying = false;
      /**
       * UPDATE DELAY IN MILLISECONDS WHEN USING setTimeout()
       */
      this._updateDelay = 17;

      /**
       * CAN WE USE 'requestAnimationFrame'
       */
      this._useAnimationFrame = (typeof window.requestAnimationFrame === "function");

      /**
       * HOW FAST ARE WE FLYING
       */
      this._moveSpeed = this.MOVE_SPEED.SLOW;

      /**
       *  SHOULD WE MAINTAIN ELEVATION WHILE FLYING
       */
      this._holdElevation = false;

      /**
       * SCREEN COORDINATES OF MAP CENTER LOCATION
       */
      this._mapCenterPoint = null;

      /**
       * SCREEN COORDINATES OF MOUSE LOCATION
       */
      this._mouseMovePoint = null;
    },

    /**
     * STARTUP
     */
    startup: function () {
      this.inherited(arguments);
      if(this.validView) {
        this.initializeEvents();
      }
    },

    /**
     *
     */
    initializeEvents: function () {
      // VIEW CLICK EVENT //
      this.clickHandle = on.pausable(this.view, "click", function (evt) {
        if(this._flying) {
          switch (this._moveSpeed) {
            /*case this.MOVE_SPEED.STOPPED:
             this._moveSpeed = this.MOVE_SPEED.SLOW;
             break;*/
            case this.MOVE_SPEED.SLOW:
              this._moveSpeed = this.MOVE_SPEED.MEDIUM;
              break;
            case this.MOVE_SPEED.MEDIUM:
              this._moveSpeed = this.MOVE_SPEED.FAST;
              break;
            case this.MOVE_SPEED.FAST:
              this._stop();
              break;
          }
        } else {
          this._start(evt.screenPoint);
        }
      }.bind(this));
      this.clickHandle.pause();
    },

    /**
     * ENABLE TOOL
     *
     * @private
     */
    enable: function () {
      this.inherited(arguments);
      // SET MAP CURSOR //
      this.setMapCursor(this.cursors.paused);
      // VIEW CLICK EVENT //
      this.clickHandle.resume();
    },

    /**
     * DISABLE TOOL
     *
     * @private
     */
    disable: function () {
      this.inherited(arguments);
      // STOP FLYING //
      this._stop();
      // SET MAP CURSOR //
      this.setMapCursor();
      // PAUSE VIEW CLICK EVENT //
      this.clickHandle.pause();
    },

    /**
     * START FLYING
     *
     * @param screenPoint
     * @private
     */
    _start: function (screenPoint) {
      // SET FLYING //
      this._flying = true;

      // SET MOVE SPEED //
      this._moveSpeed = this.MOVE_SPEED.SLOW;

      // SET MAP CURSOR //
      this.setMapCursor(this.cursors.flying);

      // MAP CENTER //
      this._mapCenterPoint = {
        x: this.view.position[0] + (this.view.width * 0.5),
        y: this.view.position[1] + (this.view.height * 0.5)
      };

      // MOUSE MOVE //
      this._mouseMovePoint = screenPoint;
      this._mouseMovePoint.y -= 1;  // FORCE UPDATES TO START RIGHT AWAY //

      if(this.mouseMoveHandle) {
        this.mouseMoveHandle.resume();
      } else {
        this.mouseMoveHandle = on.pausable(this.view.container, "mousemove", function (evt) {
          this._mouseMovePoint = {
            x: evt.clientX,
            y: evt.clientY
          };
        }.bind(this));
      }

      // START FLY ANIMATION //
      if(this._useAnimationFrame) {
        this.animationHandle = function () {
          if(this._flying) {
            // FLY //
            this._fly();
            window.requestAnimationFrame(this.animationHandle);
          } else {
            // STOP FLYING //
            this._stop();
          }
        }.bind(this);
        window.requestAnimationFrame(this.animationHandle);
      } else {
        this.animationHandle = setInterval(function () {
          if(this._flying) {
            // FLY //
            this._fly();
          } else {
            // STOP FLYING //
            this._stop();
          }
        }.bind(this), this._updateDelay);
      }

      // KEYBOARD EVENTS //
      if(this.keyUpDownDownHandle) {
        this.keyUpDownDownHandle.resume();
      } else {
        this.keyUpDownDownHandle = on.pausable(this.view.container, "keydown, keyup", this._handleKeyboardEvent.bind(this));
      }

    },

    /**
     * HANDLE KEYBOARD EVENTS
     *
     * @param evt
     * @private
     */
    _handleKeyboardEvent: function (evt) {
      // SHIFT = HOLD ELEVATION //
      this._holdElevation = evt.shiftKey;
      // ESCAPE = STOP //
      if(evt.keyCode === keys.ESCAPE) {
        this._stop();
      }
    },

    /**
     * FLY ANIMATION
     *
     * @private
     */
    _fly: function () {
      if(this._flying && this._mouseMovePoint) {

        // CALC MOVE DELTAS //
        var viewWidthHeight = ((this.view.width + this.view.height) * 0.5);
        var speedFactorX = Math.abs((this._mapCenterPoint.x - this._mouseMovePoint.x) / viewWidthHeight);
        var speedFactorY = Math.abs((this._mapCenterPoint.y - this._mouseMovePoint.y) / viewWidthHeight);
        var deltaX = ((this._mapCenterPoint.x > this._mouseMovePoint.x) ? this._moveSpeed.PIXELS : -this._moveSpeed.PIXELS) * speedFactorX;
        var deltaY = ((this._mapCenterPoint.y > this._mouseMovePoint.y) ? this._moveSpeed.PIXELS : -this._moveSpeed.PIXELS) * speedFactorY;

        // VIEW CAMERA //
        var camera = this.view.camera;
        camera.heading -= deltaX;
        camera.tilt += deltaY;

        /**
         *  THE IDEA HERE IS THAT WE'RE MOVING THE CAMERA 'FORWARD' BUT WE NEED TO DO IT IN A SMOOTH
         *  MANNER SO IT FEELS LIKE WE'RE MOVING AT THE SAME RATE WHEN CLOSE TO THE GROUND OR AT
         *  VERY HIGH ALTITUDES...
         *
         *  TODO: I THINK THIS IS JUST WRONG....
         */
        var distanceOffset = (camera.position.z * this._moveSpeed.FACTOR);
        // XY OFFSETS //
        var offsetX = Math.sin(camera.heading * Math.PI / 180.0) * distanceOffset;
        var offsetY = Math.cos(camera.heading * Math.PI / 180.0) * distanceOffset;

        // ALTITUDE OFFSET //
        var offsetZ = 0.0;
        if(!this._holdElevation) {
          var tiltHorizon = 90.0;
          var horizonOffset = (camera.tilt < tiltHorizon) ? -(tiltHorizon - camera.tilt) : (camera.tilt - tiltHorizon);
          offsetZ = (horizonOffset / tiltHorizon) * distanceOffset;
        }

        // POSITION OFFSETS //
        var newPosition = camera.position.offset(offsetX, offsetY, offsetZ);
        /**
         * TODO: HOW DO WE DETECT AND PREVENT THAT WE'RE ABOUT TO 'CRASH' OR HIT THE GROUND?
         *       CURRENTLY THE JS API ALLOWS ME TO DO THIS AND THEN JUST HANGS...
         */
        var minAltitude = 25.0;
        var surfaceElevation = this.view.basemapTerrain.getElevation(newPosition);
        if(newPosition.z < (surfaceElevation + minAltitude)) {
          newPosition.z = (surfaceElevation + minAltitude);
        }
        camera.position = newPosition;

        // ANIMATE CAMERA //
        this.view.animateTo(camera);
      }
    },

    /**
     * STOP FLYING
     *
     * @private
     */
    _stop: function () {
      // SET FLYING //
      this._flying = false;

      // RESET MOVE SPEED //
      this._moveSpeed = this.MOVE_SPEED.SLOW;

      // CANCEL FLY ANIMATION //
      if(this._useAnimationFrame) {
        window.cancelAnimationFrame(this.animationHandle);
      } else {
        clearInterval(this.animationHandle);
      }

      // PAUSE FLYING EVENTS //
      if(this.mouseMoveHandle) {
        this.mouseMoveHandle.pause();
      }
      if(this.keyUpDownDownHandle) {
        this.keyUpDownDownHandle.pause();
      }

      // SET MAP CURSOR //
      this.setMapCursor(this.cursors.paused);

      // CLEAR SCREEN LOCATIONS //
      this._mapCenterPoint = null;
      this._mouseMovePoint = null;
    }


  });

  // VERSION //
  SceneFlyTool.version = "0.0.1";

  // CLASS //
  return SceneFlyTool;
});