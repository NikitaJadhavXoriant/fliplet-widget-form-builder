Fliplet.FormBuilder.field('matrix', {
  name: 'Matrix',
  category: 'Multiple options',
  props: {
    description: {
      type: String
    },
    placeholder: {
      type: String
    },
    value: {
      type: Object,
      default: {}
    },
    defaultValue: {
      type: Object,
      default: {}
    },
    rowOptions: {
      type: Array,
      default: function() {
        return [
          {
            label: T('widgets.form.matrix.defaultOptions.row1')
          },
          {
            label: T('widgets.form.matrix.defaultOptions.row2')
          },
          {
            label: T('widgets.form.matrix.defaultOptions.row3')
          }
        ];
      }
    },
    columnOptions: {
      type: Array,
      default: function() {
        return [
          {
            label: T('widgets.form.matrix.defaultOptions.column1')
          },
          {
            label: T('widgets.form.matrix.defaultOptions.column2')
          },
          {
            label: T('widgets.form.matrix.defaultOptions.column3')
          }
        ];
      }
    }
  },
  methods: {
    /**
     * Returns unique ID to the form widget instance, field, row and column.
     *
     * @param {Number} rowIndex - an row index
     *
     * @param {Number} columnIndex - an column index
     *
     * @returns {String} an ID unique to the form widget instance, field, row and column
     */
    getOptionId: function(rowIndex, columnIndex) {
      return _.kebabCase(this.$parent.id + '-' + this.name + '-' + rowIndex + '-' + columnIndex);
    },

    /**
     * Returns unique name to the form widget instance, field, row and column.
     *
     * @param {Number} rowIndex - an row index
     *
     * @returns {String} an name unique to the form widget instance, field, row and column
     */
    getOptionNme: function(rowIndex) {
      return _.kebabCase(this.name + '-' + rowIndex);
    },

    /**
     * Click handler for each radio button in matrix
     *
     * @param {Object} row - an row object which includes id and label
     *
     * @param {Object} column - an column object which includes id and label
     *
     * @returns {undefined}
     */
    clickHandler: function(row, column) {
      this.value[row.id] = column.id;
    }
  },
  validations: function() {
    var $vm = this;
    var rules = {
      value: {}
    };

    rules.value.required = function() {
      // Check that every row has a non-empty value
      return _.every($vm.rowOptions, function(row) {
        return typeof $vm.value[row.id] !== 'undefined';
      });
    };

    return rules;
  },
  created: function() {
    var $vm = this;

    if (typeof this.value !== Object) {
      this.value = {};
    }

    _.forEach(this.rowOptions, function(row) {
      // Add reactive properties
      $vm.$set($vm.value, row.id, undefined);
    });
  }
});
