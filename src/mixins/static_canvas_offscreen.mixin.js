(function() {

    var stateDirtyProperties = fabric.Object.prototype.stateProperties.concat();
    stateDirtyProperties.splice(stateDirtyProperties.indexOf('left'), 1);
    stateDirtyProperties.splice(stateDirtyProperties.indexOf('top'), 1);
    var renderInLoopUsed = false;
    var RAF = fabric.util.requestAnimFrame;
    fabric.util.object.extend(fabric.StaticCanvas.prototype, /** @lends fabric.StaticCanvas.prototype */ {

        useOffScreenRender: true,

        /**
       * Returns true if object state (one of its state properties) was changed
       * @return {Boolean} true if instance' state has changed since `{@link fabric.Object#saveState}` was called
       */
        isDirtyObject: function (object) {
            if (!this.stateful) {
                return;
            }
            // note: if object in group than stateDirtyProperties checked including left and top settings
            var props = (!object.group) ? stateDirtyProperties : object.stateProperties;
            var isDirty = props.some(function (prop) {
                var bVal = this.originalState && this.get(prop) !== this.originalState[prop];
                //if (bVal)
                //{
                //    console.log("Changed '" + prop + "=" + this.get(prop) + "(" + this.originalState[prop] + ") for " + this.type + "->" + (this.text? "["+this.text +"]":""));
                //}
                return bVal;
            }, object);

            if (object.type === 'group' && !isDirty) { // check if some objects are dirty, if yes than group object also will be dirty
                for (var i = object.getObjects().length; i--;) {
                    var obj = object.item(i);
                    if (this.isDirtyObject(obj)) {
                        isDirty = true;
                        break;
                    }
                }
            } 
            return isDirty;
        },

        _createOffScreenCanvas: function () {
            if (!this.useOffScreenRender) {
                return;
            }
            this.offScreenCanvasEl = this._createCanvasElement();
            this.offScreenCanvasEl.setAttribute('width', this.width);
            this.offScreenCanvasEl.setAttribute('height', this.height);
            this.contextOffScreen = this.offScreenCanvasEl.getContext('2d');
        },

        /**
        * Helper for setting width/height
        * @private
        * @param {String} prop property (width|height)
        * @param {Number} value value to set property to
        * @return {fabric.Canvas} instance
        * @chainable true
        */
        _setBackstoreDimension: function (prop, value) {
            this.lowerCanvasEl[prop] = value;

            if (this.upperCanvasEl) {
                this.upperCanvasEl[prop] = value;
            }

            if (this.cacheCanvasEl) {
                this.cacheCanvasEl[prop] = value;
            }

            if (this.offScreenCanvasEl) {
                this.offScreenCanvasEl[prop] = value;
            }

            this[prop] = value;

            return this;
        },

        /**
         * Helper for setting css width/height
         * @private
         * @param {String} prop property (width|height)
         * @param {String} value value to set property to
         * @return {fabric.Canvas} instance
         * @chainable true
         */
        _setCssDimension: function (prop, value) {
            this.lowerCanvasEl.style[prop] = value;

            if (this.upperCanvasEl) {
                this.upperCanvasEl.style[prop] = value;
            }
            if (this.offScreenCanvasEl) {
                this.offScreenCanvasEl.style[prop] = value;
            }
            if (this.wrapperEl) {
                this.wrapperEl.style[prop] = value;
            }

            return this;
        },
        /**
        * Returns context of canvas where objects are drawn
        * @return {CanvasRenderingContext2D}
        */
        getContext: function () {
            return this.useOffScreenRender ? this.contextOffScreen : (this.contextTop || this.contextContainer);
        },


        /**
         * Given a context, renders an object on that context
         * @param {CanvasRenderingContext2D} ctx Context to render object on
         * @param {fabric.Object} object Object to render
         * @private
         */
        _draw: function (ctx, object) {
            if (!object) {
                return;
            }

            ctx.save();
            var v = this.viewportTransform;
            ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
            if (this._shouldRenderObject(object)) {
                object.render(ctx);
            }
            ctx.restore();
            if (!this.controlsAboveOverlay) {
                object._renderControls(ctx);
            }
        },

        

        /**
        * Clears all contexts (background, main, top) of an instance
        * @return {fabric.Canvas} thisArg
        * @chainable
        */
        clear: function () {
            this._objects.length = 0;
            if (this.discardActiveGroup) {
                this.discardActiveGroup();
            }
            if (this.discardActiveObject) {
                this.discardActiveObject();
            }
            this.clearContext(this.getContext());
            
            this.fire('canvas:cleared');
            this.renderAll();
            return this;
        },

        /**
         * Method to render only the top canvas.
         * Also used to render the group selection box.
         * @return {fabric.Canvas} thisArg
         * @chainable
         */
        renderTop: function () {
            var ctx = this.getContext();
            this.clearContext(ctx);

            // we render the top context - last object
            if (this.selection && this._groupSelector) {
                this._drawSelection();
            }

            // delegate rendering to group selection if one exists
            // used for drawing selection borders/controls
            var activeGroup = this.getActiveGroup();
            if (activeGroup) {
                activeGroup.render(ctx);
            }

            this._renderOverlay(ctx);

            this.fire('after:render');

            return this;
        },

        

        /**
         * @private
         * @param {HTMLElement | String} el &lt;canvas> element to initialize instance on
         * @param {Object} [options] Options object
         */
        _initStatic: function (el, options) {
            this._objects = [];

            this._createLowerCanvas(el);
            this._initOptions(options);
            this._createOffScreenCanvas();
            this._setImageSmoothing();

            if (options.overlayImage) {
                this.setOverlayImage(options.overlayImage, this.renderAll.bind(this));
            }
            if (options.backgroundImage) {
                this.setBackgroundImage(options.backgroundImage, this.renderAll.bind(this));
            }
            if (options.backgroundColor) {
                this.setBackgroundColor(options.backgroundColor, this.renderAll.bind(this));
            }
            if (options.overlayColor) {
                this.setOverlayColor(options.overlayColor, this.renderAll.bind(this));
            }
            this.calcOffset();
        },
        
     
        /**
         * @private
         * Renders both the top canvas and the secondary container canvas in RequestAnimationFrame callback.
         * @param {Boolean} [allOnTop] Whether we want to force all images to be rendered on the top canvas
         * @return {fabric.Canvas} instance
         * @chainable
         */
        _renderLoop: function (allOnTop) {
            var self = this;
            RAF(function () {
                self._renderAll(allOnTop);
                if (renderInLoopUsed) {
                    self._renderLoop(allOnTop);
                }
            });
            return self;
        },

        /**
        * @private
        * Renders both the top canvas and the secondary container canvas.
        * @param {Boolean} [allOnTop] Whether we want to force all images to be rendered on the top canvas
        * @return {fabric.Canvas} instance
        * @chainable
        */
        _renderAll: function (allOnTop) {
            
          var canvasToDrawOn = this[this.useOffScreenRender ? 'contextOffScreen' : ((allOnTop === true && this.interactive) ? 'contextTop' : 'contextContainer')],
              activeGroup = this.getActiveGroup();

          if (this.contextTop && this.selection && !this._groupSelector) {
              this.clearContext(this.contextTop);
          }

          if (!allOnTop) {
              this.clearContext(canvasToDrawOn);
          }

          this.fire('before:render');

          if (this.clipTo) {
              fabric.util.clipContext(this, canvasToDrawOn);
          }

          this._renderBackground(canvasToDrawOn);
          this._renderObjects(canvasToDrawOn, activeGroup);
          this._renderActiveGroup(canvasToDrawOn, activeGroup);

          if (this.clipTo) {
              canvasToDrawOn.restore();
          }

          this._renderOverlay(canvasToDrawOn);

          if (this.controlsAboveOverlay && this.interactive) {
              this.drawControls(canvasToDrawOn);
          }

          if (this.useOffScreenRender && this.offScreenCanvasEl) {
              var origCanvasToDrawOn = this[(allOnTop === true && this.interactive) ? 'contextTop' : 'contextContainer'];
              origCanvasToDrawOn.save();
              this.clearContext(origCanvasToDrawOn);
              origCanvasToDrawOn.drawImage(this.offScreenCanvasEl, 0, 0);
              origCanvasToDrawOn.restore();
          }
          this.fire('after:render');

          return this;
      },
    
        /**
        * Renders both the top canvas and the secondary container canvas.
        * @param {Boolean} [allOnTop] Whether we want to force all images to be rendered on the top canvas
        * @return {fabric.Canvas} instance
        * @chainable
        */
        renderAll: function (allOnTop) {
            if (renderInLoopUsed) {
                return this;
            }
            return this._renderAll(allOnTop);
        },
        /**
            * Renders both the top canvas and the secondary container canvas in RequestAnimationFrame callback.
            * @param {Boolean} [allOnTop] Whether we want to force all images to be rendered on the top canvas
            * @return {fabric.Canvas} instance
            * @chainable
            */
        startRenderLoop: function (allOnTop) {
            if (!renderInLoopUsed) {
                renderInLoopUsed = true;
                this._renderLoop(allOnTop);
            }
            return this;
        },
        /**
        * Stop rendering in RequestAnimationFrame callback.
        * @return {fabric.Canvas} instance
        * @chainable
        */
        stopRenderLoop: function () {
            renderInLoopUsed = false;
            return this;
        }


  });
})();
