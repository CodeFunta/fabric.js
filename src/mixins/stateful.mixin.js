/*
  Depends on `stateProperties`
*/
fabric.util.object.extend(fabric.Object.prototype, /** @lends fabric.Object.prototype */ {

  /**
   * Returns true if object state (one of its state properties) was changed
   * @return {Boolean} true if instance' state has changed since `{@link fabric.Object#saveState}` was called
   */
  hasStateChanged: function() {
    return this.stateProperties.some(function(prop) {
      return this.get(prop) !== this.originalState[prop];
    }, this);
  },

    /**
    * @private
    */
  __setupState: function (obj) {
      obj.originalState = {};
      if (obj.type === 'group') {
          obj.forEachObject(function (o) {
              this.__setupState(o);
          }, this);
      }
      obj.saveState();
  },

    /**
    * @private
    */
  __saveState: function (obj, options) {
      obj.stateProperties.forEach(function (prop) {
          this.originalState[prop] = this.get(prop);
      }, obj);

      if (options && options.stateProperties) {
          options.stateProperties.forEach(function (prop) {
              this.originalState[prop] = this.get(prop);
          }, obj);
      }
      if (obj.type === 'group') {
          obj.forEachObject(function (o) {
              this.__saveState(o);
          }, this);
      }
  },
   /**
   * Saves state of an object
   * @param {Object} [options] Object with additional `stateProperties` array to include when saving state
   * @return {fabric.Object} thisArg
   */
  saveState: function(options) {
    this.__saveState(this,options);
    return this;
  },

  /**
   * Setups state of an object
   * @return {fabric.Object} thisArg
   */
  setupState: function() {
    this.__setupState(this);
    return this;
  }
});
