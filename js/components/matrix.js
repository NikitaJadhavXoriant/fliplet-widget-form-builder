Fliplet.FormBuilder.field('matrix', {
  name: 'Matrix',
  category: 'Multiple options',
  props: {
    description: {
      type: String
    },
    value: {
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
  watch: {
    value: function(val) {
      if (val) {
        this.setValue();
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
     * @param {String} type - an element type
     *
     * @returns {String} an ID unique to the form widget instance, field, row and column
     */
    getOptionId: function(rowIndex, columnIndex, type) {
      return _.kebabCase(this.$parent.id + '-' + this.name + '-' + rowIndex + '-' + columnIndex + '-' + type);
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
     * @param {Number} rowIndex - an row index
     *
     * @param {Number} colIndex - an column index
     *
     * @returns {undefined}
     */
    clickHandler: function(row, column, rowIndex, colIndex) {
      var el = this.getOptionId(rowIndex, colIndex, 'input');

      $('#' + el).prop('checked', true);

      this.value[row.id || row.label] = column.id || column.label;

      this.updateValue();
    },

    /**
     * Click handler for each radio button in matrix
     *
     * @param {Number} rowIndex - an row index
     *
     * @param {Number} colIndex - an column index
     *
     * @returns {undefined}
     */
    focusHandler: function(rowIndex, colIndex) {
      var $vm = this;

      if (rowIndex >= 0 && colIndex >= 0) {
        var row = this.rowOptions[rowIndex];
        var col = this.columnOptions[colIndex];

        $('#' + $vm.getOptionId(rowIndex, colIndex, 'input')).focus();

        $('#' + $vm.getOptionId(rowIndex, colIndex, 'span')).focus();

        this.value[row.id || row.label] = col.id || col.label;
        this.clickHandler(row, col, rowIndex, colIndex);
      }
    },
    setValue: function() {
      var $vm = this;

      if ($vm.value === undefined || _.isEmpty($vm.value)) {
        $vm.value = {};
        _.forEach(this.rowOptions, function(row) {
          $vm.$set($vm.value, row.id || row.label, undefined);
        });
      } else if (this.defaultValueSource !== 'default') {
        _.forOwn($vm.value, function(key, value) {
          var row = _.find($vm.rowOptions, function(row) {
            return (_.has(row, 'label') && _.has(row, 'id')) ? row.id === value : row.label === value;
          });

          var rowIndex = _.findIndex($vm.rowOptions, function(row) {
            return (_.has(row, 'label') && _.has(row, 'id')) ? row.id === value : row.label === value;
          });

          var col = _.find($vm.columnOptions, function(col) {
            return (_.has(col, 'label') && _.has(col, 'id')) ? col.id === key : col.label === key;
          });

          var colIndex = _.findIndex($vm.columnOptions, function(col) {
            return (_.has(col, 'label') && _.has(col, 'id')) ? col.id === key : col.label === key;
          });

          $vm.clickHandler(row, col, rowIndex, colIndex);
        });
      }
    },
    onReset: function() {
      if (this.defaultValueSource !== 'default') {
        this.setValueFromDefaultSettings({ source: this.defaultValueSource, key: this.defaultValueKey });
      }

      this.$emit('_input', this.name, this.value);
    }
  },
  validations: function() {
    var $vm = this;
    var rules = {
      value: {}
    };

    if (this.required && !this.readonly) {
      rules.value.required = function() {
      // Check that every row has a non-empty value
        return _.every($vm.rowOptions, function(row) {
          return typeof $vm.value[row.id || row.label] !== 'undefined';
        });
      };
    }

    return rules;
  },
  mounted: function() {
    var $vm = this;

    if (this.defaultValueSource !== 'default') {
      this.setValueFromDefaultSettings({ source: this.defaultValueSource, key: this.defaultValueKey }).then(function() {
        $vm.setValue();
      });
    }
  },
  created: function() {
    this.setValue();
    Fliplet.FormBuilder.on('reset', this.onReset);
  },
  destroyed: function() {
    Fliplet.FormBuilder.off('reset', this.onReset);
  }
});
