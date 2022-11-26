Fliplet.FormBuilder.field('matrix', {
  name: 'Matrix',
  category: 'Multiple options',
  props: {
    description: {
      type: String
    },
    value: {
      type: String
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
          }
        ];
      }
    }
  },
  watch: {
    value: function(val) {
      if (this.checkValue(val) === 'clear') {
        this.clearValue();
      } else {
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
    getOptionName: function(rowIndex) {
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

      if (row.id && this.value[row.id]) {
        delete this.value[row.id];
      }

      if (this.value[row.label]) {
        delete this.value[row.label];
      }

      this.value[row.id || row.label] = column.id || column.label;

      this.$emit('_input', this.name, this.value);
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

    /**
     * Set default undefined value for each row if value is blank
     *
     * @returns {undefined}
     */
    setDefaultValue: function() {
      var $vm = this;

      $vm.value = {};

      _.forEach(this.rowOptions, function(row) {
        $vm.$set($vm.value, row.id || row.label, undefined);
      });
    },

    /**
     * Set value for each row as per selection and default value
     *
     * @returns {undefined}
     */
    setValue: function() {
      var $vm = this;

      if ($vm.value === undefined || _.isEmpty($vm.value)) {
        this.setDefaultValue();
      } else {
        if (typeof $vm.value === 'string') {
          $vm.value = JSON.parse($vm.value);
        }

        _.forOwn($vm.value, function(key, value) {
          var row = _.find($vm.rowOptions, function(row) {
            return (_.has(row, 'label') && _.has(row, 'id')) ? row.id === value : row.label === value;
          });

          var rowIndex = _.findIndex($vm.rowOptions, function(row) {
            return (_.has(row, 'label') && _.has(row, 'id')) ? row.id === value || row.label === value : row.label === value;
          });

          var col = _.find($vm.columnOptions, function(col) {
            return (_.has(col, 'label') && _.has(col, 'id')) ? col.id === key : col.label === key;
          });

          var colIndex = _.findIndex($vm.columnOptions, function(col) {
            return (_.has(col, 'label') && _.has(col, 'id')) ? col.id === key || col.label === key : col.label === key;
          });

          // setTimeout using to load all HTML and then execute below piece of code.
          setTimeout(function() {
            if (row && col) {
              $vm.clickHandler(row, col, rowIndex, colIndex);
            } else if (rowIndex >= 0) {
              $vm.clickHandler($vm.rowOptions[rowIndex], $vm.columnOptions[colIndex], rowIndex, colIndex);
            }
          });
        });
      }
    },

    /**
     * Clears the value for each row
     *
     * @returns {undefined}
     */
    clearValue() {
      if (!this.$refs.matrix) {
        return;
      }

      var $vm = this;

      _.forEach(this.rowOptions, function(row, rowIndex) {
        _.forEach($vm.columnOptions, function(col, colIndex) {
          var el = $vm.getOptionId(rowIndex, colIndex, 'input');

          $('#' + el).prop('checked', false);
        });
      });

      if (this.value === '') {
        this.setDefaultValue();
      }
    },

    /**
     * Check if all rows has column values or not
     *
     * @param {object} val - value of selected options
     *
     * @returns {undefined}
     */
    checkValue: function(val) {
      if (typeof val === 'string' && val !== '') {
        val = JSON.parse(this.value);
      }

      var checkFlag = '';
      var $vm = this;
      var columnOpt = [];

      if (val === '') {
        val = {};
        checkFlag = 'clear';
      } else if (!_.isEmpty(val)) {
        var result = [];

        _.forOwn(val, function(value) {
          if (typeof value !== 'undefined') {
            result.push(value);
          }
        });

        if (result.length > 0) {
          _.forEach(result, function(col) {
            _.find($vm.columnOptions, function(column) {
              if (column.label === col || column.id === col) {
                columnOpt.push(column);
              }
            });
          });
        }

        if (result.length === 0) {
          checkFlag = 'clear';
        } else if (columnOpt.length === 0) {
          checkFlag = 'clear';
        } else {
          checkFlag = 'set';
        }
      } else {
        checkFlag = 'set';
      }

      return checkFlag;
    },
    onReset: function(data) {
      if (data.id === this.$parent.id) {
        if (this.defaultValueSource !== 'default') {
          this.setValueFromDefaultSettings({ source: this.defaultValueSource, key: this.defaultValueKey });
          this.$emit('_input', this.name, this.value);
        }

        if (this.checkValue(this.value) === 'clear') {
          this.clearValue();
        }
      }
    },

    /**
     * Check if the value has correct rowOptions and columnOptions or not
     *
     * @returns {undefined}
     */
    checkInvalidValue: function() {
      if (!this.value) {
        return;
      }

      var validColumns = [];
      var $vm = this;

      _.forOwn(this.value, function(key) {
        _.find($vm.columnOptions, function(col) {
          if (col.label === key || col.id === col) {
            validColumns.push(col);
          }
        });
      });

      if (validColumns.length > 0) {
        return true;
      }

      return false;
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
    if (typeof this.value === 'string' && this.value !== '') {
      this.value = JSON.parse(this.value);
    }

    if (!this.checkInvalidValue()) {
      this.value = {};
    }

    this.setValue();

    Fliplet.FormBuilder.on('reset', this.onReset);
  },
  destroyed: function() {
    Fliplet.FormBuilder.off('reset', this.onReset);
  }
});
