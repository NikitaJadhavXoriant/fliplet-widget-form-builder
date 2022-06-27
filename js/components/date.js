Fliplet.FormBuilder.field('date', {
  name: 'Date picker',
  category: 'Text inputs',
  props: {
    placeholder: {
      type: String
    },
    description: {
      type: String
    },
    autofill: {
      type: String,
      default: 'default'
    },
    defaultSource: {
      type: String,
      default: 'load'
    },
    empty: {
      type: Boolean,
      default: true
    }
  },
  data: function() {
    return {
      datePicker: null,
      isInputFocused: false,
      isPreview: Fliplet.Env.get('preview'),
      today: moment().format('YYYY-MM-DD')
    };
  },
  validations: function() {
    var rules = {
      value: {}
    };

    if (this.required) {
      rules.value.required = window.validators.required;
    }

    return rules;
  },
  computed: {
    isApplyCurrentDateField: function() {
      return this.autofill === 'always' || this.autofill === 'default';
    },
    readonlyValue: function() {
      return this.value && moment(this.value).isValid()
        ? TD(this.value, { format: 'L' })
        : '';
    }
  },
  mounted: function() {
    this.initDatePicker();

    if (this.defaultValueSource !== 'default') {
      this.setValueFromDefaultSettings({
        source: this.defaultValueSource,
        key: this.defaultValueKey
      });
    }

    if (!this.value || this.autofill === 'always') {
      // HTML5 date field wants YYYY-MM-DD format
      this.value = this.today;
      this.empty = false;
    }

    if (this.autofill === 'empty') {
      this.value = '';

      return;
    }

    this.$emit('_input', this.name, this.value, false, true);
    this.$v.$reset();
  },
  watch: {
    value: function(val) {
      if (this.autofill === 'always' && val === '') {
        this.value = this.today;

        return;
      }

      if (this.datePicker) {
        this.datePicker.set(val, false);
      }

      if (this.isPreview && this.$v.value.$invalid) {
        this.highlightError();
      }

      this.$emit('_input', this.name, val, false, true);
    }
  },
  created: function() {
    Fliplet.Hooks.on('beforeFormSubmit', this.onBeforeSubmit);
  },
  destroyed: function() {
    Fliplet.Hooks.off('beforeFormSubmit', this.onBeforeSubmit);
  },
  methods: {
    initDatePicker: function() {
      if (this.datePicker || !this.$refs.datePicker) {
        return;
      }

      var $vm = this;

      this.datePicker = Fliplet.UI.DatePicker(this.$refs.datePicker, {
        required: this.required || this.autofill === 'always',
        value: this.value
      });

      this.datePicker.change(function(value) {
        $vm.value = value;
        $vm.updateValue();
      });
    },
    onBeforeSubmit: function(data) {
      if (['default', 'always'].indexOf(this.autofill) > -1 && data[this.name] === '') {
        data[this.name] = this.defaultSource === 'submission' ? moment().format('YYYY-MM-DD') : this.today;
      }
    }
  }
});
