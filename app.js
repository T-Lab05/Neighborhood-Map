
//grab the side-menu
var sideMenu = document.getElementById("side-menu");
var map = document.getElementById('map');
// a function to toggle the side-menu
function toggleSideMenu(){
    if (sideMenu.style.left=="0px") {
        sideMenu.style.left = "-300px";
    }else{
        sideMenu.style.left = "0px";
    }
}

// a callback function after getting response from Google maps javascript API
function initMap(){

    // ViewModel. It is inside in initMap function so that it is envoked
    // after a browser download Google maps javascript API library
    function viewModel(){
        var map = new google.maps.Map(document.getElementById('map'),{
            center: {lat: 35.011410, lng: 135.768038},
            zoom: 15,
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT
            },
        });

        //Instantiate the PlaceService objejct from google Place library
        var service = new google.maps.places.PlacesService(map)

        // Initial request to the textSearch. The map initially displays restaurants in neighborhood.
        var request = {
            query:"restaurant",
            location: map.center,
            radius: 100,
        }

        service.textSearch(request,callback);

        // Callback function for textSearch
        function callback(places, status, pagination){
            if(status === google.maps.places.PlacesServiceStatus.OK){
                places.forEach (function(place){
                                   createMarker(place);
                                });
                if(pagination.hasNextPage){
                    pagination.nextPage();
                };
            // if status is OVER_QUERY_LIMIT, wait for while and redo text seach
            }else if(status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                setTimeout(function(){
                    callback(places, status, pagination);
                },1000);
            // if status is not "success", display the error message.
            }else{
                alert("Failure relavant to Google Places API Web Service. " +
                       "HTTP Response status is : " + status);
            }
        } // end of callback

        function createMarker(place){
            // Create a Marker object
            var marker = new google.maps.Marker({
                position: place.geometry.location,
                title: place.name,
                address: place.formatted_address,
                types: place.types,
                map: map
            });

            // Add a click event to a marker.
            google.maps.event.addListener(marker, 'click',
                    function() {
                        // Instantiate a InfoWindow object
                        var infowindow = new google.maps.InfoWindow();

                        // Create a requestURL for forsquare API
                        var targetLocation = marker.position.lat() + ',' + marker.position.lng();
                        var client_id = "PWPU2CEVBE3WJDSETK4MMNQPW15MYFH3QILODBPBIRJIZOIG";
                        var client_secret = "RWXQNV005UE2N5I2QBAIENAY4YJMSQEZWI22QS54TGXEWP0Z";
                        var apiVersion = "20161016";
                        var query = marker.title;
                        var limit = 2;

                        // Create a requestURL for foursquare API
                        var requestURL = 'https://api.foursquare.com/v2/venues/search?' + 'll=' + targetLocation + '&client_id=' + client_id + '&client_secret=' +
                            client_secret + '&v=' + apiVersion + '&query=' + query + '&limit=' + limit;

                        // GET data from foursquare server and process it
                        $.get(requestURL,function(results,status){
                            if(status == "success"){
                                if(results.response.venues.length == 0){
                                    infowindow.setContent('<div> Sorry. <br> No infomation about this place.</div>')
                                }else{

                                    var firstCandidate = results.response.venues[0];

                                    // Store only useful values in a dictionary from the results
                                    var infomationBox = {
                                        name: firstCandidate.name,
                                        phone: firstCandidate.contact.formattedPhone,
                                        website: firstCandidate.url,
                                    };

                                    // HTML String to insert an InfoWindow later
                                    var contentString ='';

                                    // Iterate through the infomationBox and add HTML String when a value is not "undefined".
                                    for(var key in infomationBox){
                                        if(infomationBox[key] !== undefined){
                                            switch(key){
                                                case "name":
                                                    contentString = contentString + '<strong> ' + infomationBox[key] + '</strong><br>';
                                                    break;
                                                case "phone":
                                                    contentString = contentString + '<span> Tel :  ' + infomationBox[key] + '</span><br>';
                                                    break;
                                                case "website":
                                                    contentString = contentString +'<a target ="_blank" href="' + infomationBox[key]+ '"> Website </a><br>';
                                                    break;
                                            } // switch
                                        } // if
                                    }// for loop

                                    // set contents on an InfoWindow
                                    infowindow.setContent(contentString);
                                } // inner if

                            }else{
                                infowindow.setContent('<div>Error: '  + status + '</div>');
                            }// outer if

                        infowindow.open(map,marker);

                        }); // end of anonymous function in $.get( ) and right parenthesis of $.get( )
                    });// end of anonymous function in addListner( ) and right parenthesis of addListner ( )

            // Push a marker into a locationArray
            self.locationArray.push(marker);

        }// createMarker()


        // Data Part
        var self = this;

        // a variable binded to a text to search locations
        self.searchText = ko.observable("restaurant");

        // a variable binded to a text to filter locations
        self.filterText = ko.observable("");

        // an array to store marker objects to be searched
        self.locationArray = ko.observableArray([]);

        // an array to store marker objects to be filtered from locationArray
        self.filteredArray = ko.computed(function(){
            if( !self.filterText() ){
                self.locationArray().forEach(function(marker){
                    marker.setMap(map);
                });
                return self.locationArray();
            }else{
                // Array to stock marekers to be filtered temporarily
                var returnedArray = [];

                // When marker.types inclues filterText or marker.address includes it, the marker is pushed into returnedArray.
                self.locationArray().forEach(function(marker){
                    if( marker.types.includes(self.filterText().toLowerCase()) ||
                        marker.address.toLowerCase().includes(self.filterText().toLowerCase())){
                                    returnedArray.push(marker);
                    }
                });

                // Remove all markers from the map
                self.locationArray().forEach(function(marker){
                    marker.setMap(null);
                })

                // Display markers in returnedArray on the map
                returnedArray.forEach(function(marker){
                    marker.setMap(map);
                })

                return returnedArray;
            } // if
        }); // filteredArray

        // a variable to count the number of items in filteredArray
        self.numberOfLocation = ko.computed(function(){
            return self.filteredArray().length + ' Results for '+ self.searchText();
        });

        // A function to do Google Place's text search with the kewword in the search Box
        self.searchPlaces = function(){
            // Remove markers from the map
            self.locationArray().forEach(function(marker){
                 marker.setMap(null);
            });
            // Clear the locationArray
            self.locationArray([]);

            var request ={
                query: self.searchText(),
                bounds: map.getBounds()
            };
            service.textSearch(request,callback);
        };

        // A function to bounce a marker when the relavant item in the side bar is clicked
        self.animateMarker = function(marker){
            self.filteredArray().forEach(function(marker){
                marker.setAnimation(null);
            })
            marker.setAnimation(google.maps.Animation.BOUNCE);
        }

    } // end of ViewModel

    ko.applyBindings(new viewModel());
    // var database = firebase.database();
    //   var data = {"name":"Jan"}
    //   database.ref().set(data);

};//end of initMap