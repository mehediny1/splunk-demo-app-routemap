define(
  'mapObjectsView', 
  ['underscore', 'backbone', 'mapObjectsViewModel'], 
  function(_, Backbone, MapObjectsViewModel) {

  'use strict'

  /*
  * Routes map view
  */
  var RoutesMapView = Backbone.View.extend({
    
    el: $('#routes-map-view'),

    events: {
      'change #input-speed-value': 'userChangeSpeed',
      'change #input-graduality-value': 'userChangeGraduality',
      'change #input-time': 'userChangeTime',
      'click #button-play': 'userPlay',
      'click #button-pause': 'userPause',
      'click #button-autozoom': 'userAutoZoom',
      'click #map-objects-header input[type=checkbox]:first': 'userToggleAllObjects',
      'click #map-objects-header input[type=checkbox]:last': 'userToggleAllRoutes',
    },

    initialize: function() {
      this.viewModel = new MapObjectsViewModel;

      this.buttonPlay = this.$('#button-play');
      this.buttonPause = this.$('#button-pause');
      this.spanSpeedValue = this.$('#span-speed-value');
      this.inputSpeedValue = this.$('#input-speed-value');
      this.spanGradualityValue = this.$('#span-graduality-value');
      this.inputGradualityValue = this.$('#input-graduality-value');
      this.labelBeginTime = this.$('#bar-time-ranges div:first-child > span');
      this.labelCurrentTime = this.$('#bar-time-ranges div:nth-child(2) > span');
      this.labelEndTime = this.$('#bar-time-ranges div:last-child > span');
      this.inputTime = this.$('#input-time');
      this.objectsListView = this.$('#map-objects-list');
      this.checkboxAllObjects = this.$('#map-objects-header input[type=checkbox]:first');
      this.checkboxAllRoutes = this.$('#map-objects-header input[type=checkbox]:last');

      // Connect view to view-model
      this.viewModel
        .on('change:currentTime', function() {
          this.labelCurrentTime.text(
            this.viewModel.has('currentTime') ? (new Date(this.viewModel.get('currentTime') * 1000)).toLocaleString() : '');
          this.inputTime.prop('disabled', !this.viewModel.has('currentTime'));
          this.inputTime.val(this.viewModel.get('currentTime'));
        }.bind(this))
        .on('change:beginTime', function() {
          if (this.viewModel.has('beginTime')) {
            this.inputTime.prop('min', this.viewModel.get('beginTime'));
            this.labelBeginTime.text((new Date(this.viewModel.get('beginTime') * 1000)).toLocaleString());
          } else {
            this.labelBeginTime.text('');
          }
        }.bind(this))
        .on('change:endTime', function() {
          if (this.viewModel.has('endTime')) {
            this.inputTime.prop('max', this.viewModel.get('endTime'));
            this.labelEndTime.text((new Date(this.viewModel.get('endTime') * 1000)).toLocaleString());
          } else {
            this.labelEndTime.text('');
          }
        }.bind(this))
        .on('change:speed', function() {
          if (this.viewModel.has('speed')) {
            var currentSpeed = this.viewModel.get('speed');
            this.spanSpeedValue.text(currentSpeed);
            this.inputSpeedValue.val(currentSpeed);
            this.inputSpeedValue.prop('disabled', false);
          } else {
            this.spanSpeedValue.text('');
            this.inputSpeedValue.prop('disabled', true);
          }
        }.bind(this))
        .on('change:graduality', function() {
          if (this.viewModel.has('graduality')) {
            var currentGraduality = this.viewModel.get('graduality');
            this.spanGradualityValue.text(currentGraduality);
            this.inputGradualityValue.val(currentGraduality);
            this.inputGradualityValue.prop('disabled', false);
          } else {
            this.spanGradualityValue.text('');
            this.inputGradualityValue.prop('disabled', true);
          }
        }.bind(this))
        .on('change:playInterval change:currentTime', function() {
          var isPlaying = this.viewModel.has('playInterval');
          this.buttonPlay.prop('disabled', !this.viewModel.has('currentTime') || isPlaying);
          this.buttonPause.prop('disabled', !isPlaying);
        }.bind(this))
        .on('change:realtime', function(viewModel, realtime) {
          if (realtime) {
            this.$('#routes-playback-toolbar').hide();
          } else {
            this.$('#routes-playback-toolbar').show();
          }
        }.bind(this))
        .trigger('change:currentTime change:beginTime change:endTime change:speed change:graduality change:playInterval');

        this.listenTo(this.viewModel.collection, 'add', function(model) {
          this.objectsListView.append((new MapObjectListView({model: model})).render().el);
        }.bind(this));

        this.listenTo(this.viewModel.collection, 'reset', function() {
          this.objectsListView.empty();
        }.bind(this))
    },

    // Event handlers
    userChangeSpeed: function() {
      var isPlaying = this.viewModel.has('playInterval');
      if (isPlaying) this.viewModel.pause();
      this.viewModel.set('speed', this.inputSpeedValue.val());
      if (isPlaying) this.viewModel.play();
    },

    userChangeGraduality: function() {
      var isPlaying = this.viewModel.has('playInterval');
      if (isPlaying) this.viewModel.pause();
      this.viewModel.set('graduality', parseFloat(this.inputGradualityValue.val()));
      if (isPlaying) this.viewModel.play();
    },

    userChangeTime: function() {
      this.viewModel.pause();
      this.viewModel.setCurrentTime(parseFloat(this.inputTime.val()));
    },

    userPlay: function() {
      this.viewModel.play();
    },

    userPause: function() {
      this.viewModel.pause();
    },

    userAutoZoom: function() {
      this.viewModel.autoZoom();
    },

    userToggleAllRoutes: function() {
      var value = this.checkboxAllRoutes.prop('checked');
      this.viewModel.collection.each(function(model) {
        model.set('showRoute', value);
      });
    },

    userToggleAllObjects: function() {
      this.viewModel.pause();
      var value = this.checkboxAllObjects.prop('checked');
      this.viewModel.collection.each(function(model) {
        model.set('showObject', value);
      });
    }
  });

  var MapObjectListView = Backbone.View.extend({
    
    tagName: 'li',

    template: _.template($('#map-object-list-template').html()),

    events: {
      "click input[type=checkbox]:first": "toggleShowObject",
      "click input[type=checkbox]:last": "toggleShowRoute"
    },

    initialize: function() {
      this.model
        .on('change:showRoute', function(model, showRoute) {
            this.$('input[type=checkbox]:last').prop('checked', showRoute);
          }.bind(this))
        .on('change:showObject', function(model, showObject) {
            this.$('input[type=checkbox]:first').prop('checked', showObject);
          }.bind(this));
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    toggleShowObject: function() {
      this.model.toggleShowObject();
    },

    toggleShowRoute: function() {
      this.model.toggleShowRoute();
    }
  })

  // Require export (create new travel system)
  return RoutesMapView;
});

