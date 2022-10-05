Fliplet.FormBuilder.field('checkbox', {
  name: 'Checkboxes (multi-select)',
  category: 'Multiple options',
  props: {
    value: {
      type: Array,
      default: []
    },
    defaultValue: {
      type: String,
      default: ''
    },
    description: {
      type: String
    },
    options: {
      type: Array,
      default: function() {
        return [
          {
            label: T('widgets.form.checkbox.defaultOptions.option1')
          },
          {
            label: T('widgets.form.checkbox.defaultOptions.option2')
          }
        ];
      }
    },
    addSelectAll: {
      type: Boolean,
      default: false
    },
    selectedAll: {
      type: Boolean,
      default: false
    },
    selectedName: {
      type: String,
      default: ''
    }
  },
  watch: {
    value: {
      deep: true,
      handler: function() {
        if (this.addSelectAll) {
          var $vm = this;

          var ordered = _.sortBy(this.value, function(val) {
            return _.findIndex($vm.options, function(option) {
              return (option.label || option.id) === val;
            });
          });

          var allOptions = _.map(this.options, function(option) {
            return option.label || option.id;
          });

          this.selectedAll = _.isEqual(ordered, allOptions);

          if (this.name !== this.selectedName && this.addSelectAll) {
            this.selectedAll = true;
          }
        }
      }
    },
    selectedAll: {
      deep: true,
      handler: function(val) {
        if (this.addSelectAll) {
          var $vm = this;

          if (val) {
            this.value = [];

            this.options.forEach(function(option) {
              $vm.value.push(option.label);
            });
          } else if (this.value.length === this.options.length) {
            this.value = [];
          }

          this.selectedName = this.name;
        }
      }
    }
  },
  validations: function() {
    var rules = {
      value: {}
    };

    if (this.required && !this.readonly) {
      rules.value.required = window.validators.required;
    }

    return rules;
  },
  methods: {
    updateValue: function() {
      var $vm = this;

      // Sort selected options by their index as a checkbox input option
      var ordered = _.sortBy(this.value, function(val) {
        return _.findIndex($vm.options, function(option) {
          return (option.label || option.id) === val;
        });
      });

      this.highlightError();

      this.selectedName = this.name;

      this.$emit('_input', this.name, ordered);
    },
    clickHandler: function(option) {
      var val = option.id || option.label;
      var index = this.value.indexOf(val);

      if (index === -1) {
        this.value.push(val);
      } else {
        this.value.splice(index, 1);
      }

      this.updateValue();
    }
  },
  created: function() {
    var $vm = this;

    if (this.value.length > 0) {
      var selectedOptions = [];

      this.value.forEach(function(value) {
        var selectedOption = _.find($vm.options, function(option) {
          return (_.has(option, 'label') && _.has(option, 'id')) ? option.id === value : option.label === value;
        });

        if (selectedOption) {
          selectedOptions.push(selectedOption);
        }
      });

      this.value = selectedOptions.length ? _.uniqWith(this.value, _.isEqual) : [];
    }

    if (this.defaultValue) {
      this.value = this.defaultValue.split(/\n/);
      this.updateValue(this.name, this.value);
    } else if (!Array.isArray(this.value)) {
      this.value = [];
      this.updateValue(this.name, this.value);
    }
  }
});
