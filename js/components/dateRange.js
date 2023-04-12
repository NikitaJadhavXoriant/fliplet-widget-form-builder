Fliplet.FormBuilder.field('dateRange', {
  name: 'Date range',
  category: 'Text inputs',
  props: {
    value: {
      type: Object,
      default: {
        start: '',
        end: ''
      }
    },
    description: {
      type: String
    },
    autofill: {
      type: String,
      default: 'always'
    },
    defaultSource: {
      type: String,
      default: 'submission'
    },
    defaultEndDays: {
      type: Number,
      default: 2
    },
    showPredefinedRanges: {
      type: Boolean,
      default: true
    },
    placeholder: {
      type: String,
      default: function() {
        return '-- ' + T('widgets.form.dateRange.rangePlaceholder');
      }
    }
  },
  data: function() {
    return {
      dateRange: null,
      isInputFocused: false,
      isPreview: Fliplet.Env.get('preview'),
      today: moment().locale('en').format('YYYY-MM-DD'),
      selectedRange: ''
    };
  },
  mounted: function() {
    this.initDaterange();

    if (this.defaultValueSource !== 'default') {
      this.setValueFromDefaultSettings({
        source: this.defaultValueSource,
        key: this.defaultValueKey
      });
    }

    if (this.autofill === 'default' || this.autofill === 'always') {
      this.value = {
        start: this.today,
        end: this.today
      };
      this.empty = false;
    }

    if (this.autofill === 'empty') {
      this.value = {
        start: '',
        end: ''
      };

      return;
    }

    this.$emit('_input', this.name, this.value, false, true);
    this.$v.$reset();
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
  computed: {
    isApplyCurrentDateField: function() {
      return this.autofill === 'always' || this.autofill === 'default';
    },
    predefinedRanges: function() {
      return [
        {
          label: T('widgets.form.dateRange.predefinedRanges.today')
        },
        {
          label: T('widgets.form.dateRange.predefinedRanges.yesterday')
        },
        {
          label: T('widgets.form.dateRange.predefinedRanges.tomorrow')
        },
        {
          label: T('widgets.form.dateRange.predefinedRanges.nextWeek')
        },
        {
          label: T('widgets.form.dateRange.predefinedRanges.lastWeek')
        },
        {
          label: T('widgets.form.dateRange.predefinedRanges.nextMonth')
        },
        {
          label: T('widgets.form.dateRange.predefinedRanges.lastMonth')
        }
      ];
    }
  },
  watch: {
    value: function(val) {
      if (!val && ['default', 'always'].indexOf(this.autofill) > -1 && (this.required || this.autofill === 'always')) {
        this.value = {
          start: this.today,
          end: this.today
        };

        if (this.dateRange) {
          this.dateRange.set(val, true);
        }

        this.$emit('_input', this.name, val, false, true);

        return;
      }

      if (this.isPreview && this.$v.value.$invalid) {
        this.highlightError();
      }

      if (this.dateRange) {
        this.dateRange.set(val, true);
      }

      this.$emit('_input', this.name, val, false, true);
    },
    selectedRange: function(val) {
      var newDate = {
        start: '',
        end: ''
      };

      switch (val) {
        case T('widgets.form.dateRange.predefinedRanges.today'):
          newDate = this.getDate('today');
          break;
        case T('widgets.form.dateRange.predefinedRanges.yesterday'):
          newDate = this.getDate('yesterday');
          break;
        case T('widgets.form.dateRange.predefinedRanges.tomorrow'):
          newDate = this.getDate('tomorrow');
          break;
        case T('widgets.form.dateRange.predefinedRanges.nextWeek'):
          newDate = this.getDate('nextWeek');
          break;
        case T('widgets.form.dateRange.predefinedRanges.lastWeek'):
          newDate = this.getDate('lastWeek');
          break;
        case T('widgets.form.dateRange.predefinedRanges.nextMonth'):
          newDate = this.getDate('nextMonth');
          break;
        case T('widgets.form.dateRange.predefinedRanges.lastMonth'):
          newDate = this.getDate('lastMonth');
          break;
        default:
          newDate = this.getDate('today');
          break;
      }

      if (this.dateRange) {
        this.dateRange.set(newDate, true);
      }

      this.value = newDate;
      this.$emit('_input', this.name, this.value, false, true);
    }
  },
  created: function() {
    Fliplet.Hooks.on('beforeFormSubmit', this.onBeforeSubmit);
  },
  destroyed: function() {
    Fliplet.Hooks.off('beforeFormSubmit', this.onBeforeSubmit);
  },
  methods: {
    initDaterange: function() {
      var $vm = this;

      if (this.dateRange && !this.$refs.dateRange) {
        return;
      }

      if (!this.value.start || !this.value.end && ['default', 'always'].indexOf(this.autofill) > -1 && (this.required || this.autofill === 'always')) {
        $vm.value = {
          start: this.today,
          end: this.today
        };
      }

      this.dateRange = Fliplet.UI.DateRange(this.$refs.dateRange, {
        required: this.required || this.autofill === 'always',
        forceRequire: false,
        value: this.value,
        readonly: this.readonly
      });

      this.dateRange.change(function(value) {
        if (!value || !value.start || !value.end) {
          this.selectedRange = '';
        }

        $vm.value = value;
        $vm.updateValue();
      });
    },
    getDate: function(option) {
      switch (option) {
        case 'today':
          return {
            start: moment().locale('en').format('YYYY-MM-DD'),
            end: moment().locale('en').format('YYYY-MM-DD')
          };
        case 'yesterday':
          return {
            start: moment().subtract(1, 'days').locale('en').format('YYYY-MM-DD'),
            end: moment().subtract(1, 'days').locale('en').format('YYYY-MM-DD')
          };
        case 'tomorrow':
          return {
            start: moment().add(1, 'days').locale('en').format('YYYY-MM-DD'),
            end: moment().add(1, 'days').locale('en').format('YYYY-MM-DD')
          };
        case 'nextWeek':
          return {
            start: moment().add(1, 'days').locale('en').format('YYYY-MM-DD'),
            end: moment().add(7, 'days').locale('en').format('YYYY-MM-DD')
          };
        case 'lastWeek':
          return {
            start: moment().subtract(7, 'days').locale('en').format('YYYY-MM-DD'),
            end: moment().subtract(1, 'days').locale('en').format('YYYY-MM-DD')
          };
        case 'nextMonth':
          return {
            start: moment().add(1, 'days').locale('en').format('YYYY-MM-DD'),
            end: moment().add(30, 'days').locale('en').format('YYYY-MM-DD')
          };
        case 'lastMonth':
          return {
            start: moment().subtract(30, 'days').locale('en').format('YYYY-MM-DD'),
            end: moment().subtract(1, 'days').locale('en').format('YYYY-MM-DD')
          };
        default:
          break;
      }
    },
    onBeforeSubmit: function(data) {
      // Empty date fields are validated to null before this hook is called
      if (this.autofill === 'always' && data[this.name] === null) {
        data[this.name] = this.defaultSource === 'submission' ?
          {
            start: moment().locale('en').format('YYYY-MM-DD'),
            end: moment().locale('en').format('YYYY-MM-DD')
          } :
          {
            start: this.today,
            end: this.today
          };
      }
    }
  }
});

