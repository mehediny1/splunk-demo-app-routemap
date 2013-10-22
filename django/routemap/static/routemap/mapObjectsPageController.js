define(
  'mapObjectsPageController', 
  [
    'underscore',
    'mapObjectsView',
    'splunkjs/mvc/searchbarview',
    'splunkjs/mvc/searchcontrolsview',
    'splunkjs/mvc/searchmanager'
  ], 
  function(
    _, 
    MapObjectsView,
    SearchBarView,
    SearchControlsView,
    SearchManager) {

  'use strict'

  var PageController = function() {

    var defaultTimerange = { earliest_time:"-60m@m", latest_time:"now" };

    this.mapObjectsView = new MapObjectsView();

    this.searchManager = new SearchManager({
      id: 'appSearchManager',
      app: 'routemap',
      preview: true,
      required_field_list: '*',
      status_buckets: 300,
      earliest_time: defaultTimerange.earliest_time,
      latest_time: defaultTimerange.latest_time,
      search: 'source=firebase | `normalize(ts=ts, lat=lat, lon=lon, field1=routeTag, field2=id)`'
    });

    this.searchPanel = $('#searchPanel');

    // Instantiate the views and search manager
    this.searchBarView = new SearchBarView({
      managerid: this.searchManager.id,
      el: this.searchPanel.append('div'),
      earliest_time: defaultTimerange.earliest_time,
      latest_time: defaultTimerange.latest_time,
    }).render();

    // Update the search manager when the query in the searchbar changes
    this.searchBarView.on('change', function() {
      this.searchManager.set('search', this.searchBarView.val());
    }.bind(this));

    // Update the search manager when the timerange in the searchbar changes
    this.searchBarView.timerange.on('change', function(timerange) {
      this.mapObjectsView.viewModel.realtime(timerange.latest_time === 'rt');
      this.searchManager.search.set(this.searchBarView.timerange.val());
    }.bind(this));

    this.view = new SearchControlsView({
      managerid: this.searchManager.id,
      el: this.searchPanel.append('div')
    }).render();

    this.pageProgress = $('#routes-map-progress');
    this.pageProgress.hide();

    this.searchManager
    .on('search:start', function() {
      this.mapObjectsView.viewModel.pause();
      this.mapObjectsView.viewModel.removeAllObjects();
      // Realtime search does not fire done event
      if (!this.mapObjectsView.viewModel.realtime()) {
        this.pageProgress.show();
      }
    }.bind(this))
    .on('search:done', function() {
      this.pageProgress.hide();
    }.bind(this))
    .on('search:failed', function() {
      this.pageProgress.hide();
      // TODO: Show error to user
    }.bind(this));

    var dataHandler = function(results) {
      var dataPoints = [];

      var hasData = this.mapObjectsView.viewModel.has('currentTime');

      for (var rIndex = 0; rIndex < results.length; rIndex++) {
        var result = results[rIndex];
        
        if (result.data) {
          var data = result.data.split(';');
          var point = { ts: parseFloat(data[0]), lat: parseFloat(data[1]), lon: parseFloat(data[2]) };
          delete result['data'];
          dataPoints.push({obj: result, point: point});
        }
      }

      this.mapObjectsView.viewModel.addDataPoints(dataPoints);
      
      if (!hasData) {
        this.mapObjectsView.viewModel.autoZoom();
      }
      this.mapObjectsView.viewModel.play();
    }.bind(this);

    // Connect to search

    // When we are in real-time we get only events on preview
    var previewData = this.searchManager.data("preview", {count: 0, output_mode: 'json'});
    previewData.on('data', function() {
      if (previewData.hasData() && this.mapObjectsView.viewModel.realtime()) {
        dataHandler(previewData.data().results);
      }
    }.bind(this));

    // When we are not in real-time we get events on results
    var resultsData = this.searchManager.data('results', {count: 0, output_mode: 'json'});
    resultsData.on('data', function() {
      if (resultsData.hasData() && !this.mapObjectsView.viewModel.realtime()) {
        dataHandler(resultsData.data().results);
      }
    }.bind(this));
  };

  return PageController;

});