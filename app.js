// Grab the side-menu
var sideMenu = document.getElementById('side-menu');
// Grab the map div
var map = document.getElementById('map');

// A callback function after getting response from Google maps javascript API
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

        // Instantiate the PlaceService objejct from google Place library
        var service = new google.maps.places.PlacesService(map);

        // Initial request to the textSearch. The map initially displays restaurants in neighborhood.
        var request = {
            query: 'restaurant',
            location: map.center,
            radius: 100,
        };
        service.textSearch(request,callback);

        // Callback function for textSearch
        function callback(places, status, pagination){
            if(status === google.maps.places.PlacesServiceStatus.OK){
                places.forEach (function(place){
                                   createMarker(place);
                                });
                if(pagination.hasNextPage){
                    pagination.nextPage();
                }
            // If status is OVER_QUERY_LIMIT, wait for while and redo text seach
            }else if(status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                setTimeout(function(){
                    callback(places, status, pagination);
                },1000);
            // If status is not "success", display the error message.
            }else{
                alert('Failure relavant to Google Places API Web Service. ' +
                       'HTTP Response status is : ' + status);
            }
        } // end of callback

        // A function to creat a marker object
        function createMarker(place){
            // Create a Marker object
            var marker = new google.maps.Marker({
                position: place.geometry.location,
                title: place.name,
                address: place.formatted_address,
                types: place.types,
            });

            addClickEvent(marker);
            // Push a marker into a locationArray
            self.locationArray.push(marker);

        }// createMarker()

        // A function to add click event listner to a marker.
        // InfoWindow contains information relavant to the place with Foursquare API.
        function addClickEvent(marker){
            // Add a click event to a marker.
            google.maps.event.addListener(marker, 'click',
                function() {
                    // Instantiate a InfoWindow object
                    var infowindow = new google.maps.InfoWindow();

                    // Create a requestURL for forsquare API
                    var targetLocation = marker.position.lat() + ',' + marker.position.lng();
                    var client_id = 'PWPU2CEVBE3WJDSETK4MMNQPW15MYFH3QILODBPBIRJIZOIG';
                    var client_secret = 'RWXQNV005UE2N5I2QBAIENAY4YJMSQEZWI22QS54TGXEWP0Z';
                    var apiVersion = '20161016';
                    var query = marker.title;
                    var limit = 2;

                    // Create a requestURL for foursquare API
                    var requestURL = 'https://api.foursquare.com/v2/venues/search?' + 'll=' + targetLocation + '&client_id=' + client_id + '&client_secret=' +
                        client_secret + '&v=' + apiVersion + '&query=' + query + '&limit=' + limit;

                    // GET data from foursquare server and process it
                    $.get(requestURL,function(results,status){
                        if(status == 'success'){
                            if(results.response.venues.length == 0){
                                infowindow.setContent('<div> Sorry. <br> No infomation about this place.</div>');
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
                                            case 'name':
                                                contentString = contentString + '<strong> ' + infomationBox[key] + '</strong><br>';
                                                break;
                                            case 'phone':
                                                contentString = contentString + '<span> Tel :  ' + infomationBox[key] + '</span><br>';
                                                break;
                                            case 'website':
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

                    }); // anonymous function in $.get( ). Right parenthesis of $.get( )
                });// anonymous function in addListner( ). Right parenthesis of addListner( )
        } //end of addClickEvent()



        // ******************* Knockout Object ***************************************************
        var self = this;

        // a variable binded to a text to search locations
        self.searchText = ko.observable('restaurant');

        // a variable binded to a text to filter locations
        self.filterText = ko.observable('');

        // an array to store marker objects to be searched
        self.locationArray = ko.observableArray([]);

        // an array to store marker objects to be filtered from locationArray
        self.filteredArray = ko.computed(function(){
            // If filterText is not there, just return locationArray
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
                });

                // Display markers in returnedArray on the map
                returnedArray.forEach(function(marker){
                    marker.setMap(map);
                });

                return returnedArray;
            } // if
        }); // filteredArray

        // An observable Array to store favorite locations
        self.favorites = ko.observableArray([]);

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
            // Stop the current animation
            self.filteredArray().forEach(function(marker){
                marker.setAnimation(null);
            });
            self.favorites().forEach(function(marker){
                marker.setAnimation(null);
            });
            // Make the marker bounce
            marker.setAnimation(google.maps.Animation.BOUNCE);
        };

        // A function to add a location to self.favorites
        self.addFavorite = function(marker){
            // Check if the location is duplicate
            var exist = false;
            self.favorites().forEach(function(favoriteMarker){
                if(marker.title == favoriteMarker.title){
                    exist = true;
                }
            });
            // When the location is not duplicate, Add it to database
            if(!exist){
                // Replace information from Marker object to Place object,
                // Because we don't neccessarily store all information of Marker Object.
                var place = {
                    title: marker.title,
                    position: marker.position,
                    address: marker.address,
                };
                database.ref().push(JSON.stringify(place));
            }
        };

        // A function to remove a marker from favorites array and database
        self.removeFavorite = function(marker){
            // Remove the marker icon from the map
            marker.setMap(null);
            // Remove the marker from favorites array
            self.favorites.remove(marker);
            // Remove the marker from database
            database.ref(marker.databaseIndex).remove();
        };

        //a function to display the search tab in the side menu, binded to the search tab.
        self.openSearchTab = function(){
            var tabcontent = document.getElementsByClassName('tabcontent');
            var tablinks = document.getElementsByClassName('tablinks');

            // Disappear all tabs once
            for( var i = 0; i < tabcontent.length; i++){
                tabcontent[i].style.display = 'none';
            }

            // Remove "active" attribute from classname of all tabs
            for( i = 0; i < tablinks.length; i++){
                tablinks[i].className = tablinks[i].className.replace(' active','');
            }

            // Show selected tabcontent and empasize the tablink.
            var searchTab = document.getElementById('search');
            searchTab.style.display = 'block';
            searchTab.className += ' active';
            //event.currentTarget.className += " active";

            // Set the background color of side menu as gray.
            sideMenu.style.backgroundColor = 'gray';

            self.favorites().forEach(function(marker){
                    marker.setMap(null);
            });

            self.filteredArray().forEach(function(marker){
                    marker.setMap(map);
            });
        };

        //a function to display the favorite tab in the side menu, binded to the favorite tab.
        self.openFavoriteTab = function(){
            var tabcontent = document.getElementsByClassName('tabcontent');
            var tablinks = document.getElementsByClassName('tablinks');

            // Disappear all tabs once
            for( var i = 0; i < tabcontent.length; i++){
                tabcontent[i].style.display = 'none';
            }

            // Remove "active" attribute from classname of all tabs
            for( i = 0; i < tablinks.length; i++){
                tablinks[i].className = tablinks[i].className.replace(' active','');
            }

            // Show selected tabcontent and empasize the tablink.
            var favoriteTab = document.getElementById('favorite');
            favoriteTab.style.display = 'block';
            favoriteTab.className += ' active';
            //event.currentTarget.className += " active";

            // Set the background color of side menu as cream yellow.
            sideMenu.style.backgroundColor = '#f7f5d7';

            self.filteredArray().forEach(function(marker){
                    marker.setMap(null);
            });
            self.favorites().forEach(function(marker){
                    marker.setMap(map);
            });
        };

        // A function to toggle the side menu binded to the humbager icon
        self.toggleSideMenu =function(){
            if (sideMenu.style.left == '0px') {
                sideMenu.style.left = '-300px';
            }else{
                sideMenu.style.left = '0px';
            }
        };

        // Get a reference to the database in Firebase
        var database = firebase.database();

        // Add "value" event listner, which gets all data from database everytime database is changed.
        database.ref().on('value', function(snapshot){
            // Grab value of snapshot
            var snapshotDictionary = snapshot.val();
            // Iterate through snapshotDictionary
            for ( var index in snapshotDictionary){
                if(snapshotDictionary.hasOwnProperty(index)){
                    // Parse JSON string
                    var data = JSON.parse(snapshotDictionary[index]);
                    // Check if a location has already existed in favorites array
                    var exist = false;
                    self.favorites().forEach(function(exsitingMarker){
                        if( data.title == exsitingMarker.title ){
                            exist = true;
                        }
                    });

                    // When a location is not duplicate, add it to favorites array
                    if(!exist){
                        // Make a yellow marker for a favorite place
                        var yellowIcon = new google.maps.MarkerImage(
                            'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|FFFF00|40|_|%E2%80%A2',
                            new google.maps.Size(21, 34),
                            new google.maps.Point(0, 0),
                            new google.maps.Point(10, 34),
                            new google.maps.Size(21,34)
                        );

                        // Construct Marker object with data from database.
                        // Note to store database index key for later use.
                        // We also change marker color for favorite places.
                        var marker = new google.maps.Marker({
                            title: data.title,
                            position: data.position,
                            address: data.address,
                            icon: yellowIcon,
                            databaseIndex: index
                        });

                        // Add event listener for infoWindow
                        addClickEvent(marker);

                        // Add the marker to favorites array
                        self.favorites.push(marker);
                    }
                }
            } //for loop
        }); // eventlistener

    // Open the search tab when this app starts.
    self.openSearchTab();

    } // end of ViewModel

    // Bind ViewModel to DOM
    ko.applyBindings(new viewModel());


}//end of initMap