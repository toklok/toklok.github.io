
var URL_CONST = 'https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=37.786971%7C-122.399677&gslimit=100&format=json';

ko.bindingHandlers.googlemap = {

    init: function (element, valueAccessor) {
        var
            value = valueAccessor(),
            mapOptions = {
                zoom: 16,
                center: new google.maps.LatLng(value.centerLat, value.centerLon),
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

        map = new google.maps.Map(element, mapOptions);

        var inputForSearch = (document.getElementById('inputSearch'));

        map.controls[google.maps.ControlPosition.TOP_LEFT].push(inputForSearch);

        infowindow = new google.maps.InfoWindow();

        getWiki();
    }
};


function viewModel() {

    var self = this;

    self.query = ko.observable('');

    self.items = ko.observableArray([]);

    self.filterPins = ko.computed(function () {
        var search = self.query().toLowerCase();

        return ko.utils.arrayFilter(self.items(), function (pin) {
            var doesMatch = pin.name().toLowerCase().indexOf(search) >= 0;

            pin.isVisible(doesMatch);

            return doesMatch;
        });
    });

}

//Pin is a class that encapsulates all of our data from the AJAX call and makes pins visible on the map.

function Pin(map, title, lat, long, dist) {
    var marker;

    this.name = ko.observable(title);
    this.lat = ko.observable(lat);
    this.long = ko.observable(long);
    this.dist = ko.observable(dist);

    marker = new google.maps.Marker({
        position: new google.maps.LatLng(this.lat(), this.long()),
        animation: google.maps.Animation.DROP,
        map: map
    });

    var contentString = 'This is the ' + this.lat() + ' longitude and ' + this.long() + ' is the longitude and the name of this place is the  ' + this.name() + ' and  ' + this.dist() + ' distance';


    google.maps.event.addListener(marker, 'click', function () {

        infowindow.setContent(contentString);
        infowindow.open(map, marker);

    });

    this.isVisible = ko.observable(false);

    this.isVisible.subscribe(function (currentState) {
        if (currentState) {
            marker.setMap(map);
        } else {
            marker.setMap(null);
        }
    });

    this.isVisible(true);

}


function getWiki(location) {

    $.ajax({
        url: URL_CONST,

        dataType: 'jsonp',

        success: function (data) {


            var dataFromServer = data.query.geosearch;

            var mappedData = ko.utils.arrayMap(dataFromServer, function (item) {

                return new Pin(map, item.title, item.lat, item.lon, item.dist);

            });

            self.items(mappedData);


            //Sanity check

            console.log("Success");

        },

        error: function (error) {

            //Simple error checking for AJAX call.

            console.log('Error');
        }
    });
}

// Make Knockout.js work by applying the Binding.

ko.applyBindings(viewModel());