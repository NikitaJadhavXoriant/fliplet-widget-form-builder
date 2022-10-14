Fliplet.FormBuilder.field('input', {
  name: 'Text input',
  category: 'Text inputs',
  props: {
    placeholder: {
      type: String
    },
    description: {
      type: String
    },
    idType: {
      type: String,
      default: ''
    },
    generateGuid: {
      type: Boolean,
      default: false
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
    getNewGuid: function() {
      if (!this.value && this.idType === 'guid') {
        this.value = Fliplet.guid();
        this.updateValue();
      }
    }
  },
  created: function() {
    this.getNewGuid();
    Fliplet.FormBuilder.on('reset', this.getNewGuid);
  }
});
