var URL_CONST = 'https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=37.786971%7C-122.399677&gslimit=100&format=json';

$(window).resize(function() {

    google.maps.event.trigger(map, "resize");
});


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

function Pin(map, title, lat, lng, dist) {
    var marker;

    this.name = ko.observable(title);
    this.lat = ko.observable(lat);
    this.lng = ko.observable(lng);
    this.dist = ko.observable(dist);


    marker = new google.maps.Marker({
        position: new google.maps.LatLng(this.lat(), this.lng()),
        map: map
    });

    var contentString = '' + this.lat() + ' and' + this.lng() + '' + this.name() + ' and  ' + this.dist() + ' is the distance from Wikimedia Foundation';


    google.maps.event.addListener(marker, 'click', function (e) {

        var infoBox = new InfoBox({
            latlng: this.getPosition(),
            map: map,
            content: contentString
    });

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

//Utility

function InfoBox(opts) {
    google.maps.OverlayView.call(this);
    this.latlng_ = opts.latlng;
    this.map_ = opts.map;
    this.content = opts.content;
    this.offsetVertical_ = -195;
    this.offsetHorizontal_ = 5;
    this.height_ = 165;
    this.width_ = 266;
    var me = this;
    this.boundsChangedListener_ =
        google.maps.event.addListener(this.map_, "bounds_changed", function () {
            return me.panMap.apply(me);
        });
    // Once the properties of this OverlayView are initialized, set its map so
    // that we can display it. This will trigger calls to panes_changed and
    // draw.
    this.setMap(this.map_);
}
/* InfoBox extends GOverlay class from the Google Maps API
 */
InfoBox.prototype = new google.maps.OverlayView();
/* Creates the DIV representing this InfoBox
 */
InfoBox.prototype.remove = function () {
    if (this.div_) {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    }
};
/* Redraw the Bar based on the current projection and zoom level
 */
InfoBox.prototype.draw = function () {
    // Creates the element if it doesn't exist already.
    this.createElement();
    if (!this.div_) return;
    // Calculate the DIV coordinates of two opposite corners of our bounds to
    // get the size and position of our Bar
    var pixPosition = this.getProjection().fromLatLngToDivPixel(this.latlng_);
    if (!pixPosition) return;
    // Now position our DIV based on the DIV coordinates of our bounds
    this.div_.style.width = this.width_ + "px";
    this.div_.style.left = (pixPosition.x + this.offsetHorizontal_) + "px";
    this.div_.style.height = this.height_ + "px";
    this.div_.style.top = (pixPosition.y + this.offsetVertical_) + "px";
    this.div_.style.display = 'block';
};
/* Creates the DIV representing this InfoBox in the floatPane. If the panes
 * object, retrieved by calling getPanes, is null, remove the element from the
 * DOM. If the div exists, but its parent is not the floatPane, move the div
 * to the new pane.
 * Called from within draw. Alternatively, this can be called specifically on
 * a panes_changed event.
 */
InfoBox.prototype.createElement = function () {
    var panes = this.getPanes();
    var div = this.div_;
    if (!div) {
        // This does not handle changing panes. You can set the map to be null and
        // then reset the map to move the div.
        div = this.div_ = document.createElement("div");
        div.className = "infobox"
        var contentDiv = document.createElement("div");
        contentDiv.className = "content"
        contentDiv.innerHTML = this.content;
        var closeBox = document.createElement("div");
        closeBox.className = "close";
        closeBox.innerHTML = "x";
        div.appendChild(closeBox);

        function removeInfoBox(ib) {
            return function () {
                ib.setMap(null);
            };
        }
        google.maps.event.addDomListener(closeBox, 'click', removeInfoBox(this));
        div.appendChild(contentDiv);
        div.style.display = 'none';
        panes.floatPane.appendChild(div);
        this.panMap();
    } else if (div.parentNode != panes.floatPane) {
        // The panes have changed. Move the div.
        div.parentNode.removeChild(div);
        panes.floatPane.appendChild(div);
    } else {
        // The panes have not changed, so no need to create or move the div.
    }
}
/* Pan the map to fit the InfoBox.
 */
InfoBox.prototype.panMap = function () {
    // if we go beyond map, pan map
    var map = this.map_;
    var bounds = map.getBounds();
    if (!bounds) return;
    // The position of the infowindow
    var position = this.latlng_;
    // The dimension of the infowindow
    var iwWidth = this.width_;
    var iwHeight = this.height_;
    // The offset position of the infowindow
    var iwOffsetX = this.offsetHorizontal_;
    var iwOffsetY = this.offsetVertical_;
    // Padding on the infowindow
    var padX = 40;
    var padY = 40;
    // The degrees per pixel
    var mapDiv = map.getDiv();
    var mapWidth = mapDiv.offsetWidth;
    var mapHeight = mapDiv.offsetHeight;
    var boundsSpan = bounds.toSpan();
    var longSpan = boundsSpan.lng();
    var latSpan = boundsSpan.lat();
    var degPixelX = longSpan / mapWidth;
    var degPixelY = latSpan / mapHeight;
    // The bounds of the map
    var mapWestLng = bounds.getSouthWest().lng();
    var mapEastLng = bounds.getNorthEast().lng();
    var mapNorthLat = bounds.getNorthEast().lat();
    var mapSouthLat = bounds.getSouthWest().lat();
    // The bounds of the infowindow
    var iwWestLng = position.lng() + (iwOffsetX - padX) * degPixelX;
    var iwEastLng = position.lng() + (iwOffsetX + iwWidth + padX) * degPixelX;
    var iwNorthLat = position.lat() - (iwOffsetY - padY) * degPixelY;
    var iwSouthLat = position.lat() - (iwOffsetY + iwHeight + padY) * degPixelY;
    // calculate center shift
    var shiftLng =
        (iwWestLng < mapWestLng ? mapWestLng - iwWestLng : 0) +
        (iwEastLng > mapEastLng ? mapEastLng - iwEastLng : 0);
    var shiftLat =
        (iwNorthLat > mapNorthLat ? mapNorthLat - iwNorthLat : 0) +
        (iwSouthLat < mapSouthLat ? mapSouthLat - iwSouthLat : 0);
    // The center of the map
    var center = map.getCenter();
    // The new map center
    var centerX = center.lng() - shiftLng;
    var centerY = center.lat() - shiftLat;
    // center the map to the new shifted center
    map.setCenter(new google.maps.LatLng(centerY, centerX));
    // Remove the listener after panning is complete.
    google.maps.event.removeListener(this.boundsChangedListener_);
    this.boundsChangedListener_ = null;
};