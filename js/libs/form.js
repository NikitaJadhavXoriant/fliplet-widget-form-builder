var formBuilderInstances = [];

function drawImageOnCanvas(img, canvas) {
  var imgWidth = img.width;
  var imgHeight = img.height;
  var imgRatio = imgWidth / imgHeight;
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var canvasRatio = canvasWidth / canvasHeight;
  var context = canvas.getContext('2d');

  // Re-interpolate image draw dimensions based to CONTAIN within canvas
  if (imgRatio < canvasRatio) {
    // IMAGE RATIO is slimmer than CANVAS RATIO, i.e. margin on the left & right
    if (imgHeight > canvasHeight) {
      // Image is taller. Resize image to fit height in canvas first.
      imgHeight = canvasHeight;
      imgWidth = imgHeight * imgRatio;
    }
  } else if (imgWidth > canvasWidth) {
    // IMAGE RATIO is wider than CANVAS RATIO, i.e. margin on the top & bottom
    // Image is wider. Resize image to fit width in canvas first.
    imgWidth = canvasWidth;
    imgHeight = imgWidth / imgRatio;
  }

  var drawX = (canvasWidth > imgWidth) ? (canvasWidth - imgWidth) / 2 : 0;
  var drawY = (canvasHeight > imgHeight) ? (canvasHeight - imgHeight) / 2 : 0;

  context.drawImage(img, drawX, drawY, imgWidth, imgHeight);
}

/* eslint-disable-next-line */
function addThumbnailToCanvas(imageURI, indexCanvas, self, isFileCanvas) {
  var $vm = self;

  if (!imageURI.match(/^http/)) {
    imageURI = (imageURI.indexOf('base64') > -1)
      ? imageURI.split(';filename:')[0]
      : 'data:image/jpeg;base64,' + imageURI;
  } else {
    imageURI = Fliplet.Media.authenticate(imageURI);
  }

  $vm.$nextTick(function() {
    if (!this.$refs.canvas) {
      return;
    }

    var canvas = this.$refs.canvas[indexCanvas];
    var context = canvas.getContext('2d');

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    var img = new Image();

    img.onload = function imageLoadedFromURI() {
      drawImageOnCanvas(this, canvas);
    };

    img.src = imageURI;
  });
}


// Wait for form fields to be ready, as they get defined after translations are initialized
Fliplet().then(function() {
  Fliplet.Widget.instance('form-builder', function(data) {
    var saveDelay = 1000; // save progress after 1s from last input
    var selector = '[data-form-builder-id="' + data.id + '"]';
    var progressKey = 'form-builder-progress-' + (data.uuid || data.id);

    var entryId = !Fliplet.Env.get('interact') && data.dataSourceId && Fliplet.Navigate.query.dataSourceEntryId;
    var formMode = Fliplet.Navigate.query.mode;
    var entry;
    var isResetAction = false;

    var formReady;
    var formPromise = new Promise(function(resolve) {
      formReady = resolve;
    });

    if (entryId) {
      entryId = parseInt(entryId, 10) || undefined;
    }

    function getProgress() {
      var progress = localStorage.getItem(progressKey);

      if (!progress) {
        return;
      }

      return JSON.parse(progress);
    }

    function debounce(func, wait, immediate) {
      var timeout;

      return function() {
        var context = this;
        var args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }

    function getMatrixValue(value, field) {
      var matrixOption = {};

      if (!value || typeof value === 'object') {
        return value;
      }

      if (value.indexOf('[') > -1 || value.indexOf(']') > -1) {
        _.forEach(value.split(/\r?\n/), function(rawOption) {
          if (rawOption) {
            rawOption = rawOption.trim();

            var regex = /\[(.*)\]/g;
            var match = rawOption.split(regex).filter(r => r !== '');

            if (match.length > 1) {
              matrixOption[match[0].trim()] =  match[1].trim();
            } else {
              _.forEach(field.rowOptions, function(row) {
                if (!_.has(matrixOption, row.label)) {
                  matrixOption[row.label] = match[0].trim();
                }
              });
            }
          }
        });
      } else {
        _.forEach(field.rowOptions, function(row) {
          matrixOption[row.label] = value;
        });
      }

      return matrixOption;
    }

    function loadFieldValueFromSource(field) {
      var result;

      switch (field.defaultValueSource) {
        case 'appStorage':
          var storage = field.source === 'storage'
            ? Fliplet.Storage
            : Fliplet.App.Storage;

          result = storage.get(field.defaultValueKey);

          break;

        case 'query':
          result = Fliplet.Navigate.query[field.defaultValueKey];

          break;

        default:
          break;
      }


      if (!(result instanceof Promise)) {
        result = Promise.resolve(result);
      }

      result.then(function(val) {
        if (field._type === 'flCheckbox') {
          if (!Array.isArray(val)) {
            val = _.compact([val]);
          }
        } else if (field._type === 'flMatrix') {
          field.value = getMatrixValue(val, field);
        } else {
          field.value = val;
        }

        debounce();
      });
    }

    function saveProgress() {
      var progress = {};

      data.fields.forEach(function(field) {
        if (field.saveProgress !== false && field.enabled) {
          progress[field.name] = field.value;
        }
      });

      localStorage.setItem(progressKey, JSON.stringify(progress));
    }

    function getFields(isEditMode) {
      var fields = _.compact(JSON.parse(JSON.stringify(data.fields || [])));

      // Make sure all updated values are stored in localstorage before get them
      saveProgress();

      var progress = getProgress();

      fields.forEach(function(field) {
        field.enabled = true;

        // Make sure these fields are not saved or populated from progress data
        if (['flParagraph', 'flTitle'].indexOf(field._type) !== -1) {
          field.saveProgress = false;
          field.populateOnUpdate = false;

          if (progress && typeof progress[field.name] !== 'undefined') {
            delete progress[field.name];
          }
        }
      });

      if (fields.length && (data.saveProgress && typeof progress === 'object') || entry) {
        fields.forEach(function(field) {
          if (entry && entry.data && field.populateOnUpdate !== false) {
            var fieldKey = isResetAction
              ? field.defaultValueKey || field.name
              : field.name || field.defaultValueKey;

            var fieldData;

            switch (field._type) {
              case 'flDateRange':
                fieldData = {
                  start: entry.data[`${fieldKey} [Start]`],
                  end: entry.data[`${fieldKey} [End]`]
                };

                if (!Fliplet.UI.DateRange.validateDateRange(fieldData)) {
                  fieldData = null;
                }

                break;
              case 'flTimeRange':
                fieldData = {
                  start: entry.data[`${fieldKey} [Start]`],
                  end: entry.data[`${fieldKey} [End]`]
                };

                if (!Fliplet.UI.TimeRange.validateTimeRange(fieldData)) {
                  fieldData = null;
                }

                break;
              case 'flMatrix':
                var option = {};

                _.forEach(field.rowOptions, function(row) {
                  var val = row.id ? row.id : row.label;
                  var matrixKey = entry.data[`${fieldKey} [${val}]`] ? entry.data[`${fieldKey} [${val}]`] : entry.data[`${fieldKey}`];

                  if ((!field.defaultValueKey && matrixKey) || (field.defaultValueKey.indexOf(val) !== -1 && matrixKey)) {
                    option[val] = matrixKey;
                  }
                });

                fieldData = option;
                break;
              default:
                fieldData = entry.data[fieldKey];

                if (typeof fieldData === 'undefined') {
                  fieldData = entry.data[field.name] || entry.data[field.defaultValueKey];
                }

                break;
            }

            if (_.has('_submit', field) && !field._submit) {
              return; // do not update the field value
            }

            var showCurrentDateTime = field.autofill === 'always';

            // Typecast field data to ensure data type is suitable for each field
            switch (field._type) {
              case 'flCheckbox':
                if (!Array.isArray(fieldData)) {
                  fieldData = _.compact([fieldData]);
                }

                break;

              case 'flImage':
              case 'flFile':
                // Don't change the data types for Image and File fields
                break;

              case 'flEmail':
              case 'flInput':
              case 'flNumber':
              case 'flTelephone':
              case 'flUrl':
                if (Array.isArray(fieldData)) {
                  fieldData = _.join(_.compact(fieldData), ', ');
                }

                break;

              case 'flTextarea':
              case 'flWysiwyg':
                if (Array.isArray(fieldData)) {
                  fieldData = _.join(_.compact(fieldData), '\n');
                }

                break;

              default:
                if (Array.isArray(fieldData)) {
                  fieldData = fieldData[0];
                }
            }

            switch (field._type) {
              case 'flDate':
                var regexDateFormat = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/;
                var regexISOFormat = /(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})[+-](\d{2})\:(\d{2})/;

                if ((regexDateFormat.exec(fieldData) || regexISOFormat.exec(fieldData)) && !showCurrentDateTime) {
                  field.value = moment(fieldData).format('YYYY-MM-DD');
                } else if (field.autofill !== 'empty')  {
                  field.value = moment().get().format('YYYY-MM-DD');
                }

                break;

              case 'flImage':
              case 'flFile':
                var img = fieldData;

                field.value = [];

                if (!isResetAction) {
                  if (Array.isArray(img)) {
                    field.value = img;
                  } else if (typeof img === 'string') {
                    field.value.push(img);
                  }
                }

                break;

              case 'flTime':
                var regexp = /^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/;

                if (regexp.exec(fieldData) && !showCurrentDateTime) {
                  field.value = fieldData;
                } else if (field.autofill !== 'empty') {
                  field.value = moment().get().format('HH:mm');
                }

                break;
              case 'flStarRating':
                field.options = _.times(5, function(i) {
                  return {
                    id: '' + (i + 1)
                  };
                });

                if (!isResetAction) {
                  field.value = fieldData;
                }

                break;
              case 'flDateRange':
                if (!fieldData && showCurrentDateTime) {
                  field.value = {
                    start: moment().get().format('YYYY-MM-DD'),
                    end: moment().get().format('YYYY-MM-DD')
                  };
                } else {
                  field.value = fieldData;
                }

                break;
              case 'flTimeRange':
                if (!fieldData && showCurrentDateTime) {
                  field.value = {
                    start: moment().get().format('HH:mm'),
                    end: moment().get().format('HH:mm')
                  };
                } else {
                  field.value = fieldData;
                }

                break;

                // There is no validation and value assignment for checkbox and radio options as there is no access to the options. This is implemented in the checkbox and radio components respectively.

              default:
                if (!fieldData) {
                  return;
                }

                field.value = fieldData;
                break;
            }

            return field.value;
          }

          if (field._type === 'flMatrix') {
            switch (field.defaultValueSource) {
              case 'default' :
                field.value = getMatrixValue(field.value, field);
                break;

              case 'query':
                loadFieldValueFromSource(field);
                break;

              default:
                break;
            }
          } else if (progress && !isEditMode) {
            var savedValue = progress[field.name];

            if (typeof savedValue !== 'undefined') {
              field.value = savedValue;
            }
          }
        });
      }

      return fields;
    }

    function isFile(value) {
      return value && typeof value.item === 'function';
    }

    var changeListeners = {};

    var $form = new Vue({
      i18n: Fliplet.Locale.plugins.vue(),
      el: $(selector)[0],
      data: function() {
        return {
          isFormValid: false,
          isSent: false,
          isSending: false,
          isSendingMessage: T('widgets.form.savingData'),
          isLoading: !!entryId,
          isLoadingMessage: T('widgets.form.retrievingData'),
          isConfigured: !!data.templateId,
          isPlaceholder: data.isPlaceholder,
          fields: getFields(),
          error: null,
          errors: {},
          isOffline: false,
          isOfflineMessage: '',
          isEditMode: data.dataStore && data.dataStore.indexOf('editDataSource') > -1,
          blockScreen: false,
          today: moment().locale('en').format('YYYY-MM-DD'),
          now: moment().locale('en').format('HH:mm'),
          id: data.id
        };
      },
      computed: {
        hasRequiredFields: function() {
          return this.fields.some(function(el) {
            return el.required && !el.readonly;
          });
        }
      },
      methods: {
        start: function(event) {
          if (event) {
            event.preventDefault();
          }

          this.isSent = false;
        },
        reset: function() {
          isResetAction = true;
          this.resetForm();
        },
        resetForm: function(trackEvents) {
          if (trackEvents !== false) {
            Fliplet.Analytics.trackEvent({
              category: 'form',
              action: 'reset'
            });
          }

          var $vm = this;
          var entryLoaded = false;

          this.fields.forEach(function(field, index) {
            var value;
            var fieldSettings = data.fields[index];

            if (field.isHidden) {
              return;
            }

            if (field._type === 'flCheckbox') {
              value = fieldSettings.defaultValue || fieldSettings.value;

              if (typeof value !== 'undefined' && !Array.isArray(value)) {
                value = value.split(/\n/);
              }
            } else if (field._type === 'flDate') {
              if (['default', 'always'].indexOf(fieldSettings.autofill) > -1) {
                value = fieldSettings.defaultSource === 'submission' ? moment().locale('en').format('YYYY-MM-DD') : $vm.today;
              } else if (fieldSettings.autofill === 'empty' && fieldSettings.defaultSource === 'load') {
                $vm.loadEntryForUpdate();
              } else {
                value = fieldSettings.value;
              }
            } else if (field._type === 'flTime') {
              if (['default', 'always'].indexOf(fieldSettings.autofill) > -1) {
                value = fieldSettings.defaultSource === 'submission' ? moment().locale('en').format('HH:mm') : $vm.now;
              } else if (fieldSettings.autofill === 'empty' && fieldSettings.defaultSource === 'load') {
                $vm.loadEntryForUpdate();
              } else {
                value = fieldSettings.value;
              }
            } else if (field._type === 'flDateRange') {
              if (['default', 'always'].indexOf(fieldSettings.autofill) > -1) {
                value = fieldSettings.defaultSource === 'submission'
                  ? { start: moment().locale('en').format('YYYY-MM-DD'), end: moment().locale('en').format('YYYY-MM-DD') }
                  : { start: $vm.today, end: $vm.today };
              } else if (fieldSettings.autofill === 'empty' && fieldSettings.defaultSource === 'load') {
                $vm.loadEntryForUpdate();
              } else {
                value = {
                  start: fieldSettings.startValue,
                  end: fieldSettings.endValue
                };
              }
            } else if (field._type === 'flTimeRange') {
              if (['default', 'always'].indexOf(fieldSettings.autofill) > -1) {
                value = fieldSettings.defaultSource === 'submission'
                  ? { start: moment().locale('en').format('HH:mm'), end: moment().locale('en').format('HH:mm') }
                  : { start: $vm.now, end: $vm.now };
              } else if (fieldSettings.autofill === 'empty' && fieldSettings.defaultSource === 'load') {
                $vm.loadEntryForUpdate();
              } else {
                value = {
                  start: fieldSettings.startValue,
                  end: fieldSettings.endValue
                };
              }
            } else {
              value = fieldSettings.value;
            }

            // Clone value if it's an array to ensure the original object does not mutate
            if (Array.isArray(value)) {
              value = value.slice(0);
            }

            if (typeof field.defaultValueSource !== 'undefined') {
              switch (field.defaultValueSource) {
                case 'profile':
                  if (!entryLoaded) {
                    $vm.loadEntryForUpdate();
                    entryLoaded = true;
                  }

                  break;
                case 'appStorage':
                  if (!field.defaultValueKey) {
                    throw new Error('A key is required to fetch data from the storage');
                  }

                  loadFieldValueFromSource(field);

                  break;
                case 'query':
                  if (!field.defaultValueKey) {
                    throw new Error('A key is required to fetch data from the navigation query parameters');
                  }

                  loadFieldValueFromSource(field);

                  break;
                default:
                  break;
              }
            }

            if (field.defaultValueSource === 'default' && field._type === 'flMatrix') {
              field.value = getMatrixValue(value, field);
            } else {
              field.value = value;
            }

            $vm.triggerChange(field.name, field.value);
          });

          localStorage.removeItem(progressKey);

          $vm.$forceUpdate();
          Fliplet.FormBuilder.emit('reset', { id: data.id });
          this.$emit('reset');
        },
        onError: function(fieldName, error) {
          if (!error) {
            if (this.errors[fieldName]) {
              delete this.errors[fieldName];
            }

            return;
          }

          this.errors[fieldName] = error;
        },
        triggerChange: function(fieldName, value) {
          if (changeListeners[fieldName]) {
            changeListeners[fieldName].forEach(function(fn) {
              fn.call(this, value);
            });
          }
        },
        onInput: function(fieldName, value, fromPasswordConfirmation, skipOnChange) {
          var $vm = this;

          this.fields.some(function(field) {
            if (field.name === fieldName) {
              if (field._type === 'flPassword' && fromPasswordConfirmation) {
                field.passwordConfirmation = value;
              } else {
                field.value = value;
              }

              if (!skipOnChange) {
                $vm.triggerChange(fieldName, value);
              }

              return true;
            }
          });

          if (data.saveProgress && typeof this.saveProgress === 'function') {
            this.saveProgress();
          }
        },
        onChange: function(fieldName, fn, runOnBind) {
          var field;

          this.fields.some(function(f) {
            if (f.name === fieldName) {
              field = f;

              return true;
            }
          });

          if (!field) {
            throw new Error('A field with the name ' + fieldName + ' has not been found in this form.');
          }

          if (typeof fn !== 'function') {
            throw new Error('Second argument must be a function');
          }

          if (!changeListeners[fieldName]) {
            changeListeners[fieldName] = [];
          }

          changeListeners[fieldName].push(fn);

          // also run it once for initialization
          if (runOnBind !== false) {
            fn.call(this, field.value);
          }
        },
        toggleField: function(fieldName, isEnabled) {
          this.fields.some(function(field) {
            if (field.name === fieldName) {
              field.enabled = !!isEnabled;

              return true;
            }
          });
        },
        getWidgetInstanceData: function() {
          return data;
        },
        getField: function(fieldName) {
          var found;

          this.fields.some(function(field) {
            if (field.name === fieldName) {
              found = field;

              return true;
            }
          });

          return found;
        },

        /**
         * Since our validation should check the input when it loses focus (the onBlur event),
         * the .lazy modifier was added, this leads to the data being updated when the input
         * loses the focus. Because of this, there is a problem when the form is submitted by
         * pressing enter instead of the submit button (in this case, the input does not lose
         * focus and its data is not updated) In order to work as expected, we need to manually
         * trigger the blur event on the input paths.
         * @returns {undefined}
         */
        triggerBlurEventOnInputs: function() {
          $(this.$el).find('input').blur();
        },
        onSubmit: function() {
          var $vm = this;
          var formData = {};

          $vm.triggerBlurEventOnInputs();

          var trackEventOp = Fliplet.Analytics.trackEvent({
            category: 'form',
            action: 'submit'
          });

          if (!(trackEventOp instanceof Promise)) {
            trackEventOp = Promise.resolve();
          }

          // form validation
          $vm.isFormValid = true;

          var invalidFields = [];

          $vm.$children.forEach(function(inputField) {
            // checks if component have vuelidate validation object
            if (inputField.$v) {
              inputField.$v.$touch();

              if (inputField.$v.$invalid) {
                if (inputField.$v.passwordConfirmation) {
                  inputField.isValid = !inputField.$v.value.$invalid;
                  inputField.isPasswordConfirmed = !inputField.$v.value.$invalid && !inputField.$v.passwordConfirmation.$invalid;
                } else {
                  inputField.isValid = false;
                }

                invalidFields.push(inputField);
                $vm.isFormValid = false;
              }
            }
          });

          /**
           * Showing an error message
           *
           * @param {String} errorMessage - an error message that we should show to the user
           *  if its empty string show default message
           * @returns {void} shows a toast message to users
           */
          function showValidationMessage(errorMessage) {
            errorMessage = errorMessage || T('widgets.form.errors.fieldsNotFilled');
            Fliplet.UI.Toast(errorMessage);
          }

          /**
           * This method will decide what we will do after isFormInvalid hook
           *
           * @returns {Promise} With this logic:
           *  1. In case there was no listener on isFormInvalid hook we will show the toast
           *     with default message
           *  2. In case when listener was resolved with Promise.resolve() we allow user to submit invalid form
           *     and will not show the toast
           *  3. In case when listener was resolved with Promise.reject() we will not show the toast
           *     and not allow form to submit
           *  4. In case when listener was resolved with Promise.reject('') we will show the toast with default text
           *  5. In case when listener was resolved with Promise.reject('error text') we will show the toast
           *     with 'error text' message
           */
          function onFormInvalid() {
            return new Promise(function(resolve, reject) {
              Fliplet.Hooks.run('isFormInvalid', invalidFields)
                .then(function(result) {
                  if (!result.length) {
                    showValidationMessage('');

                    return reject();
                  }

                  return resolve();
                })
                .catch(function(response) {
                  switch (typeof response) {
                    case 'string':
                      return showValidationMessage(response);
                    default:
                      return reject();
                  }
                });
            });
          }

          function onFormSubmission() {
            if (!$vm.isFormValid) {
              return onFormInvalid();
            }

            return Promise.resolve();
          }

          return onFormSubmission().then(function() {
            $vm.isSending = true;

            function appendField(name, value) {
              if (Array.isArray(formData[name])) {
                formData[name].push(value);
              } else if (typeof formData[name] !== 'undefined') {
                formData[name] = [formData[name], value];
              } else {
                formData[name] = value;
              }
            }

            var errorFields = Object.keys($vm.errors);
            var fieldErrors = [];

            if (errorFields.length) {
              errorFields.forEach(function(fieldName) {
                fieldErrors.push(errorFields[fieldName]);
              });

              $vm.error = fieldErrors.join('. ');
              $vm.isSending = false;

              return;
            }

            $vm.fields.forEach(function(field) {
              var value = field.value ? field.value : '';
              var type = field._type;

              if (field._submit === false || !field.enabled) {
                return;
              }

              if (field.submitWhenFalsy === false && !value) {
                return;
              }

              if (isFile(value)) {
                // File input
                for (var i = 0; i < value.length; i++) {
                  appendField(field.name, value.item(i));
                }
              } else {
                // Remove spaces and dashes from value (when it's a string)
                if (typeof value === 'string' && ['flNumber', 'flTelephone'].indexOf(type) !== -1) {
                  value = value.replace(/-|\s/g, '');
                }

                if (type === 'flDate') {
                  value = moment(value);

                  if (moment(value).isValid()) {
                    value = value.format('YYYY-MM-DD');
                  } else {
                    value = ['default', 'always'].indexOf(field.autofill) > -1 ? $vm.today : null;
                  }
                }

                if (type === 'flTime') {
                  value = moment(value, 'HH:mm a');

                  if (moment(value).isValid()) {
                    value = value.format('HH:mm');
                  } else {
                    value = ['default', 'always'].indexOf(field.autofill) > -1 ? $vm.now : null;
                  }
                }

                if (type === 'flEmail' && typeof value === 'string') {
                  value = value.toLowerCase();
                }

                if (type === 'flTimeRange' && typeof value === 'object') {
                  if (!value) {
                    value = null;
                  } else if (!value.start && !value.end) {
                    switch (field.autofill) {
                      case 'default':
                      case 'always':
                        value = {
                          start: field.defaultSource === 'submission' ? moment().format('HH:mm') : $vm.now,
                          end: field.defaultSource === 'submission' ? moment().format('HH:mm') : $vm.now
                        };

                        break;
                      case 'custom':
                        value = null;

                        break;
                      default:
                        break;
                    }
                  }
                }

                if (type === 'flDateRange' && typeof value === 'object') {
                  if (!value) {
                    value = null;
                  } else if (!value.start && !value.end) {
                    switch (field.autofill) {
                      case 'default':
                      case 'always':
                        value = {
                          start: field.defaultSource === 'submission' ? moment().format('YYYY-MM-DD') : $vm.today,
                          end: field.defaultSource === 'submission' ? moment().format('YYYY-MM-DD') : $vm.today
                        };

                        break;
                      case 'custom':
                        value = null;

                        break;
                      default:
                        break;
                    }
                  }
                }

                if (type === 'flFile') {
                  var result = _.map(value, function(val) {
                    if (!val) {
                      return '';
                    }

                    return val instanceof File || !val.url ? val : val.url;
                  });

                  value = result;
                }

                if (type === 'flDateRange' || type === 'flTimeRange') {
                  if (value) {
                    appendField(`${field.name} [Start]`, value.start);
                    appendField(`${field.name} [End]`, value.end);
                  }
                } else if (type === 'flMatrix') {
                  if (!_.isEmpty(value)) {
                    _.forEach(value, function(col, row) {
                      if (!row || !col) {
                        return '';
                      }

                      appendField(`${field.name} [${row}]`, col);
                    });
                  } else {
                    _.forEach(field.rowOptions, function(row) {
                      var val = row.id ? row.id : row.label;

                      appendField(`${field.name} [${val}]`, '');
                    });
                  }
                } else {
                  // Other inputs
                  appendField(field.name, value);
                }
              }
            });

            formPromise.then(function(form) {
              return Fliplet.Hooks.run('beforeFormSubmit', formData, form);
            }).then(function() {
              if (data.dataSourceId) {
                return Fliplet.DataSources.connect(data.dataSourceId);
              }
            }).then(function(connection) {
              // Append schema as private variable
              formData._flSchema = {};
              $vm.fields.forEach(function(field) {
                if (field.mediaFolderId) {
                  formData._flSchema[field.name] = {
                    mediaFolderId: field.mediaFolderId
                  };
                }
              });

              if (entryId && entry && data.dataSourceId) {
                return connection.update(entryId, formData, {
                  offline: false,
                  ack: data.linkAction && data.redirect,
                  source: data.uuid
                });
              }

              if (data.dataStore && data.dataStore.indexOf('dataSource') > -1 && data.dataSourceId) {
                return connection.insert(formData, {
                  offline: data.offline,
                  ack: data.linkAction && data.redirect,
                  source: data.uuid
                });
              }

              return;
            }).then(function(result) {
              return formPromise.then(function(form) {
                return Fliplet.Hooks.run('afterFormSubmit', { formData: formData, result: result }, form).then(function() {
                  if (entryId !== 'session') {
                    return;
                  }

                  // If the user just updated his/her profile
                  // let's update the cached session.
                  return Fliplet.Session.get().catch(function() {
                    // silent failure
                  });
                });
              });
            }).then(function() {
              if (data.saveProgress) {
                localStorage.removeItem(progressKey);
              }

              var operation = Promise.resolve();

              // Emails are only sent by the client when data source hooks aren't set
              if (!data.dataSourceId) {
                if (data.emailTemplateAdd && data.onSubmit && data.onSubmit.indexOf('templatedEmailAdd') > -1) {
                  operation = Fliplet.Communicate.sendEmail(_.extend({}, data.emailTemplateAdd), formData);
                }

                if (data.emailTemplateEdit && data.onSubmit && data.onSubmit.indexOf('templatedEmailEdit') > -1) {
                  operation = Fliplet.Communicate.sendEmail(_.extend({}, data.emailTemplateEdit), formData);
                }
              }

              if (data.generateEmailTemplate && data.onSubmit && data.onSubmit.indexOf('generateEmail') > -1) {
                operation = Fliplet.Communicate.composeEmail(_.extend({}, data.generateEmailTemplate), formData);
              }

              if (data.linkAction && data.redirect) {
                return operation.then(function() {
                  return trackEventOp.then(function() {
                    Fliplet.Navigate.to(data.linkAction);
                  });
                }).catch(function(err) {
                  Fliplet.Modal.alert({
                    message: Fliplet.parseError(err)
                  });
                  Fliplet.Navigate.to(data.linkAction);
                });
              }

              $vm.isSent = true;
              $vm.fields.forEach(function(field) {
                if (field._type === 'flPassword' && field.passwordConfirmation) {
                  field.passwordConfirmation = '';
                }
              });
              $vm.isSending = false;
              $vm.isResetAction = false;
              $vm.resetForm(false);
              /**
               * When we try to submit a form in Edge or IE11 and use components date picker and rich text
               * (only in this sequence) we could saw that rich text textarea become empty but there was no
               * message that we successfully submitted the form. That was because Vue wasn't updating view.
               * $forceUpdate solve this issue.
               */
              $vm.$forceUpdate();

              $vm.loadEntryForUpdate();
            }, function(err) {
              /* eslint-disable-next-line */
              console.error(err);
              $vm.error = Fliplet.parseError(err);
              $vm.isSending = false;
              Fliplet.Hooks.run('onFormSubmitError', { formData: formData, error: err });
            });

            // We might use this code to save the form data locally when going away from the page
            // $(window).unload(function onWindowUnload() {
            //   localStorage.setItem('fl-form-data-' + data.id, this.fields.map(function (field) {
            //     return { name: field.name, value: field.value };
            //   }));
            // });
          });
        },
        loadEntryForUpdate: function(fn) {
          var $vm = this;

          if (entryId || fn) {
            $vm.isLoading = true;

            var loadEntry = typeof fn === 'function'
              ? fn(entryId)
              : Fliplet.DataSources.connect(data.dataSourceId, { offline: false }).then(function(ds) {
                return ds.findById(entryId);
              });

            if (loadEntry instanceof Promise === false) {
              loadEntry = Promise.resolve(loadEntry);
            }

            return loadEntry.then(function(record) {
              if (!record) {
                $vm.error = 'This entry has not been found';
              }

              if (typeof record === 'object' && typeof record.data === 'undefined') {
                record = { data: record };
              }

              record.data = _.omitBy(record.data, function(value) {
                return _.isNil(value)
                  || (_.isObject(value) && _.isEmpty(value))
                  || (_.isString(value) && !value.length);
              });
              entry = record;

              $vm.fields = getFields(true);
              $vm.isLoading = false;
              $vm.$forceUpdate();
            }).catch(function(err) {
              var error = Fliplet.parseError(err);

              $vm.error = error;
              $vm.isLoading = false;
              $vm.$forceUpdate();

              Fliplet.UI.Toast.error(error, {
                message: T('widgets.form.errors.offlineDataError')
              });
            });
          }

          if (formMode === 'add') {
            return Promise.resolve();
          }

          if (data.autobindProfileEditing) {
            $vm.isLoading = true;

            return Fliplet.Session.get().then(function(session) {
              var isEditMode = false;

              if (session.entries && session.entries.dataSource) {
                entryId = 'session'; // this works because you can use it as an ID on the backend
                entry = session.entries.dataSource;
                isEditMode = true;
              }

              // Re-render fields
              $vm.fields = [];

              return new Promise(function(resolve) {
                setTimeout(function() {
                  $vm.fields = getFields(isEditMode);
                  $vm.isLoading = false;
                  resolve();
                }, 50);
              });
            });
          }

          return Promise.resolve();
        }
      },
      mounted: function() {
        var $vm = this;

        this.saveProgressed = debounce(saveProgress, saveDelay);

        $(selector).removeClass('hidden');

        if (!data.offline) {
          Fliplet.Navigator.onOnline(function() {
            $vm.isOffline = false;
            $vm.blockScreen = false;
          });

          Fliplet.Navigator.onOffline(function() {
            $vm.isOffline = true;
            $vm.isOfflineMessage = data.dataStore && data.dataStore.indexOf('editDataSource') > -1 ?
              T('widgets.form.errors.offlineDataError') :
              T('widgets.form.errors.offlineFormError');

            if ($vm.isEditMode && $vm.isLoading && $vm.isOffline) {
              $vm.blockScreen = true;
            }
          });
        }

        this.loadEntryForUpdate().then(function() {
          var debouncedUpdate = _.debounce(function() {
            $form.$forceUpdate();
            $vm.saveProgressed();
          }, 10);

          function validateCheckboxValue(value, options) {
            value = _.isArray(value) ? value : [value];

            if (options.length) {
              var valueProp = options[0].id ? 'id' : 'label';

              value = _.filter(value, function(elem) {
                return _.some(options, function(opt) {
                  return opt[valueProp] === elem;
                });
              });

              value = _.uniq(value);

              value = _.sortBy(value, function(val) {
                return _.findIndex(options, function(option) {
                  return option[valueProp] === val;
                });
              });
            }

            return value;
          }

          // This data is available through "Fliplet.FormBuilder.get()"
          formReady({
            name: data.name,
            // Deprecated property but kept for legacy support
            instance: $form,
            $instance: $form,
            data: function() {
              return data;
            },
            load: function(fn) {
              return $form.loadEntryForUpdate(fn);
            },
            on: function(event, fn) {
              return $form.$on(event, fn);
            },
            fields: {
              get: function() {
                return $form.fields;
              },
              set: function(fields) {
                if (!Array.isArray(fields)) {
                  throw new Error('fields must be an array');
                }

                data.fields = fields;
                $form.fields = getFields();
              }
            },
            field: function(key) {
              var field = $form.getField(key);

              if (!field) {
                throw new Error('The field ' + key + ' has not been found.');
              }

              var $field = _.find($form.$children, { name: field.name });

              if (!$field) {
                throw new Error('The field ' + key + ' has not been found.');
              }

              return {
                val: function(value) {
                  if (typeof value === 'undefined') {
                    return field.value;
                  }

                  if (field._type === 'flCheckbox') {
                    value = validateCheckboxValue(value, this.instance.options);
                  }

                  field.value = value;
                  debouncedUpdate();
                },
                set: function(data) {
                  var result;

                  if (field._type === 'flCheckbox') {
                    data = validateCheckboxValue(data, this.instance.options);
                  }

                  if (field._type === 'flDate') {
                    data = data && moment(data).isValid() ? data : '';
                  }

                  if (field._type === 'flTime') {
                    data = /^([01]\d|2[0-3]):?([0-5]\d)$/.test(data) ? data : '';
                  }

                  if (typeof data === 'function') {
                    data = { source: 'function', key: data };
                  }

                  if (typeof data !== 'object') {
                    data = { source: 'literal', key: data };
                  }

                  switch (data.source) {
                    case 'profile':
                      if (!data.key) {
                        throw new Error('A key is required to fetch data from the user\'s profile');
                      }

                      result = Fliplet.Profile.get(data.key);

                      break;
                    case 'query':
                      if (!data.key) {
                        throw new Error('A key is required to fetch data from the navigation query parameters');
                      }

                      result = Fliplet.Navigate.query[data.key];

                      break;
                    case 'storage':
                    case 'appstorage':
                      if (!data.key) {
                        throw new Error('A key is required to fetch data from the storage');
                      }

                      var storage = data.source === 'storage'
                        ? Fliplet.Storage
                        : Fliplet.App.Storage;

                      result = storage.get(data.key);

                      break;
                    case 'function':
                      result = data.key();

                      break;
                    case 'literal':
                      result = data.key;

                      break;
                    default:
                      result = data;
                  }

                  if (!(result instanceof Promise)) {
                    result = Promise.resolve(result);
                  }

                  return result.then(function(value) {
                    if (typeof value === 'undefined') {
                      value = '';
                    }

                    var hasChanged = field.value !== value;

                    if (field._type === 'flMatrix') {
                      var option = {};

                      _.some(field.rowOptions, function(row) {
                        _.each(value, function(c, r) {
                          if (row.label ===  r)    {
                            option[r] = c;
                          }
                        });
                      });
                      field.value = option;
                    } else {
                      field.value = value;
                    }

                    debouncedUpdate();

                    if (hasChanged) {
                      $form.triggerChange(field.name, field.value);
                    }
                  });
                },
                get: function() {
                  return field.value;
                },
                change: function(fn, runOnBind) {
                  return $form.onChange(field.name, fn, runOnBind);
                },
                /**
                 * Toggles a field visibility
                 * @param {Boolean} isEnabled - toggles the field visibility on and off
                 * @param {Boolean} revertValueToDefault - defaults to true - Whether the value should be reverted to its original value when showing the field
                 * @returns {undefined}
                 */
                toggle: function(isEnabled, revertValueToDefault) {
                  field.enabled = !!isEnabled;

                  if (!field.enabled && revertValueToDefault !== false) {
                    JSON.parse(JSON.stringify(data.fields || [])).some(function(f) {
                      if (field.name === f.name) {
                        field.value = f.value;

                        return true;
                      }
                    });
                  }
                },
                options: function(values) {
                  if (typeof values === 'undefined') {
                    return field.options;
                  }

                  if (!Array.isArray(values)) {
                    throw new Error('Options must be an array');
                  }

                  if (field._type === 'flSelect') {
                    // remove all invalid options
                    _.remove(values, function(val) {
                      return !(_.isObject(val) || _.isNumber(val) || (_.isString(val) && val.trim()));
                    });
                  }

                  var options = values.map(function(option) {
                    if (typeof option === 'object') {
                      if (typeof option.value !== 'undefined') {
                        option.id = option.value;
                      }

                      return option;
                    }

                    return { id: option };
                  });

                  if (!_.isEmpty(field.value)) {
                    switch (field._type) {
                      case 'flCheckbox':
                        var selectedValues = _.difference(field.value, values);

                        field.value = selectedValues.length ? [] : field.value;
                        break;
                      case 'flRadio':
                      case 'flSelect':
                        var selectedValueInOptions = _.some(values, function(option) {
                          return option === field.value;
                        });

                        field.value = selectedValueInOptions ? field.value : '';
                        break;
                      default:
                        break;
                    }
                  }

                  // Update options in field definition so they are kept between renderings
                  _.find(data.fields, { name: field.name }).options = options;

                  // Update live field
                  field.options = options;
                },
                on: function(eventName, fn) {
                  var eventListeners = data.fieldEventListeners;

                  if (!eventListeners) {
                    eventListeners = {};
                  }

                  eventListeners[field.name] = eventListeners[field.name] || {};
                  eventListeners[field.name][eventName] = eventListeners[field.name][eventName] || [];
                  eventListeners[field.name][eventName].push(fn);

                  data.fieldEventListeners = eventListeners;
                },
                off: function(eventName, fn) {
                  var eventListeners = _.get(data, ['fieldEventListeners', field.name, eventName]);

                  if (!eventListeners) {
                    return;
                  }

                  // No function provided. Clear all hook callbacks.
                  if (typeof fn === 'undefined') {
                    eventListeners = [];
                    data.fieldEventListeners[field.name][eventName] = eventListeners;

                    return;
                  }

                  // Remove matching handler
                  eventListeners.forEach(function(handler, i) {
                    if (handler === fn) {
                      eventListeners.splice(i, 1);
                    }
                  });

                  data.fieldEventListeners[field.name][eventName] = eventListeners;
                },
                instance: field,
                $instance: $field
              };
            }
          });
        });
      }
    });

    formBuilderInstances.push(formPromise);
  });
});

Fliplet.FormBuilder.get = function(name) {
  return Fliplet().then(function() {
    return Promise.all(formBuilderInstances).then(function(forms) {
      var form;

      if (typeof name === 'undefined') {
        form = forms.length ? forms[0] : undefined;
      } else {
        forms.some(function(vueForm) {
          if (vueForm.name === name) {
            form = vueForm;

            return true;
          }
        });
      }

      return form;
    });
  });
};

Fliplet.FormBuilder.getAll = function(name) {
  return Fliplet().then(function() {
    return Promise.all(formBuilderInstances).then(function(forms) {
      if (typeof name === 'undefined') {
        return forms;
      }

      return forms.filter(function(form) {
        return form.name === name;
      });
    });
  });
};
