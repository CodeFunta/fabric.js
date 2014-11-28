(function() {

  var degreesToRadians = fabric.util.degreesToRadians,
      radiansToDegrees = fabric.util.radiansToDegrees;
  var RAF = fabric.util.requestAnimFrame;
  fabric.util.object.extend(fabric.Canvas.prototype, /** @lends fabric.Canvas.prototype */ {

    /**
     * Method that defines actions when an Hammr.js gesture is detected on an object. Currently only supports
     * 2 finger gestures.
     *
     * @param {Event} e Event object by Hammer.js
     */
      __onHammerTransformGesture: function (e) {

          if (this.isDrawingMode || !e.pointers) {
              return;
          }
          var target = undefined;
          if (this._currentTransform) {
              target = this._currentTransform.target;
          }
          else {
              target = this.findTarget(e.srcEvent);
          }

          if ('undefined' !== typeof target) {
              this.__gesturesParams = {
                  'e': e,
                  'target': target
               };
			 
              this.__gesturesFrame();
              //this.__gesturesRenderer();
              //           this.__gesturesInterval(e, self, target);
          }



          this.fire('touch:gesture', { target: target, e: e });
      },

      // unused
      __gesturesParams: null,
      // unused
      __gesturesFrame: function () {
          var that = this;
          if (this.__gesturesParams === null || this._currentTransform === null) {
              return;
          }


          //RAF(function (time) {
          //    that.__gesturesRenderer(that, time);
          //    //console.log('gesture animation frame');
          //});
        that.__gesturesRenderer(that, 0);
      },
      __gesturesRenderer: function (self,time) {

          if (self.__gesturesParams === null || self._currentTransform === null) {
              return;
          }

          var e = self.__gesturesParams.e;
          
          var target = self.__gesturesParams.target;

          var t = self._currentTransform;
          //console.log("Hammer: ", e.type);
          if (e.type === 'pinchend') {
              if (t) {
                  self._finalizeCurrentTransform();
              }
          }
          else if (e.type === 'pinchin' || e.type === 'pinchout' || e.type === 'rotate') {

              t.action = 'scale';
              //            if(this._shouldCenterTransform(e, target)) {
              t.originX = t.originY = 'center';
              self._setOriginToCenter(t.target);
              //            }

              self._scaleObjectBy(e.scale);

              if (e.rotation !== 0) {
                  t.action = 'rotate';
                  self._rotateObjectByAngle(e.rotation);
              }
          }
          self.renderAll();
          t.action = 'drag';
      },

    /**
     * Method that defines actions when an Hammer.js pan is detected.
     *
     * @param {Event} e Event object by Event.js
     * @param {Event} self Event proxy object by Event.js
     */
    __onDragHammer: function(e, self) {
      this.fire('touch:drag', { e: e });
    },

   
    
    /**
     * Scales an object by a factor
     * @param {Number} s The scale factor to apply to the current scale level
     * @param {String} by Either 'x' or 'y' - specifies dimension constraint by which to scale an object.
     *                    When not provided, an object is scaled by both dimensions equally
     */
    _scaleObjectBy: function (s, by) {
        var t = this._currentTransform,
                target = t.target,
                lockScalingX = target.get('lockScalingX'),
                lockScalingY = target.get('lockScalingY');

        if (lockScalingX && lockScalingY)
            return;

        target._scaling = true;

        var constraintPosition = target.translateToOriginPoint(target.getCenterPoint(), t.originX, t.originY);

        if (!by) {
            t.newScaleX = t.scaleX * s;
            t.newScaleY = t.scaleY * s;
            if (!lockScalingX) {
                target.set('scaleX', t.scaleX * s);
            }
            if (!lockScalingY) {
                target.set('scaleY', t.scaleY * s);
            }
        }
        //            else if (by === 'x' && !target.get('lockUniScaling')) {
        //                lockScalingX || target.set('scaleX', t.scaleX * s);
        //            }
        //            else if (by === 'y' && !target.get('lockUniScaling')) {
        //                lockScalingY || target.set('scaleY', t.scaleY * s);
        //            }

        target.setPositionByOrigin(constraintPosition, t.originX, t.originY);
    },
      /**
       * Rotates object by an angle
       * @param curAngle {Number} the angle of rotation in degrees
       */
    _rotateObjectByAngle: function (curAngle) {
        var t = this._currentTransform;

        if (t.target.get('lockRotation'))
            return;
        t.target.angle = radiansToDegrees(degreesToRadians(curAngle) + t.theta);
    }

  });
})();
