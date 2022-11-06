Fliplet.FormBuilder.field('slider', {
  name: 'Slider',
  category: 'Advanced',
  props: {
    placeholder: {
      type: String
    },
    description: {
      type: String
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    value: {
      type: Number,
      default: 50
    },
    step: {
      type: Number,
      default: 1
    }
  },
  data: function() {
    return {
      slider: null
    };
  },
  watch: {
    value: function(val) {
      if (this.slider) {
        this.slider.set(val);
      }

      this.$emit('_input', this.name, val, false, true);
    }
  },
  mounted: function() {
    this.initSlider();
  },
  created: function() {
    Fliplet.FormBuilder.on('reset', this.onReset);
  },
  destroyed: function() {
    Fliplet.FormBuilder.off('reset', this.onReset);
  },
  methods: {
    initSlider: function() {
      if (this.slider || !this.$refs.slider) {
        return;
      }

      this.slider = Fliplet.UI.RangeSlider(this.$refs.slider, {
        min: this.min,
        max: this.max,
        step: this.step,
        value: this.value,
        readonly: this.readonly
      });
    },
    onReset: function() {
      if (this.defaultValueSource !== 'default') {
        this.setValueFromDefaultSettings({
          source: this.defaultValueSource,
          key: this.defaultValueKey
        }).then(function() {
          this.$emit('_input', this.name, this.value, false, true);
        });
      } else {
        if (this.value === '') {
          this.value = 50;
        }

        this.slider.set(this.value);
      }
    }
  }
});
