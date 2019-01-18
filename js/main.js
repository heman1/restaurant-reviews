let restaurants,
    neighborhoods,
    cuisines
var newMap
var markers = []

/* registering service worker */
if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('../sw.js')
          .then(function() {
                console.log('Service Worker Registered');
          }).then(function(er) {
                console.log(`error in registering service worker ${er}`)
            });
      }

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiaGltYW5zaHVuZWdpIiwiYSI6ImNqajVveW9zejFyNnIzcW1udHh3bzQwcWMifQ.3F-UUyjUNDtCGtQ9-E4MmA',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error('unable to fetch cuisine and restaurants');
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
    
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 **/
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
//  restaurants.forEach(restaurant => {
//     toggelClass(restaurant.id); 
//  });
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.tabIndex = '0';

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = "image of "+restaurant.name+" restaurant";
  image.srcset = DBHelper.imageSrcForRestaurant(restaurant);
  li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);
    
  // favourite marker
  const fav = document.createElement('div');
  fav.innerHTML = '🟊'; //character for star (may not appear on your editor)
  fav.setAttribute('tabindex', '0');
  fav.setAttribute('name', restaurant.id);
  fav.setAttribute('role', 'button');
  fav.setAttribute('aria-label', 'favourite button');
  if(restaurant.is_favorite === 'true') {
        fav.classList.add('favourite-true');
        fav.setAttribute('aria-pressed', 'true');
  }
  else {
        fav.classList.remove('favourite-true');
        fav.classList.add('favourite');
        fav.setAttribute('aria-pressed', 'false');
  }
  
  fav.addEventListener('click', (e)=> {
      changeState();
  });
  fav.onkeypress = function(e) {
      if(e.keyCode===13)
          changeState();
      else
          return;
  }
  function changeState() {
      if (fav.classList.contains('favourite-true')) {
          fav.classList.remove('favourite-true');
          fav.classList.add('favourite');
          fav.setAttribute('aria-pressed', 'false');
          DBHelper.updateFavourite(restaurant.id, 'false');
          popup('false');
      }
      else {
          fav.classList.remove('favourite');
          fav.classList.add('favourite-true');
          fav.setAttribute('aria-pressed', 'true');
          DBHelper.updateFavourite(restaurant.id, 'true');
          popup('true');
      }
  }
  li.append(fav);
  

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  address.classList.add("restaurant-address");
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute("role", "button");
  more.setAttribute("aria-label", "View details of "+restaurant.name+" restaurant");
  li.append(more)

  return li
}

/**
* pop-up
**/
popup = (value)=> {
    console.log('inside popup');
    pop = document.getElementsByClassName('alert')[0];
    context = document.getElementsByClassName('context')[0];
    star = document.getElementsByClassName('star')[0];
    pop.style.visibility = 'visible';
    pop.classList.remove('hide');
    if(value==='true') {
        console.log("marked as favourite");
        context.innerHTML = 'Marked as favourite';
        star.innerHTML = '🟊';
    }
    else {
        console.log("removed from favourite");
        context.innerHTML = 'Removed from favourite';
        star.innerHTML = '&#9888;';
    }
    window.setTimeout(function(){
        pop.classList.add('hide');
    }, 2000);
    
}
/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
    
    updateTabindex();
} 

/* aasigning new tab indexes to the elements */

updateTabindex = (restaurants) => {
      var y = -1;
      leafletTabIndex(y);
      locationTabindex(y);
      document.getElementsByClassName("leaflet-right")[1].setAttribute("tabindex", "0");
      console.log("tabindex added");
      
}

/* to change the tabindex of the leaflet at right bottom of the map */
function leafletTabIndex(y) {
      var x = document.getElementsByClassName("leaflet-control")[1].querySelectorAll("a"); 
      
      for(var i = 0; i < x.length ; i++) {
          x[i].setAttribute("tabindex", y);
      }
}

/* to change the tabindex of the the locations inside the map which are marked with blue location marker*/
function locationTabindex(y) {
      var x = document.getElementsByClassName("leaflet-marker-pane")[0].querySelectorAll("img");
      
      for( var i =0 ; i< x.length ; i++ ) {
          x[i].setAttribute("tabindex", y);
      }
}

/* event to listen for the enter keypress in order to get inside the sub-elements */
window.addEventListener("keypress", changeTabindex , false);

function changeTabindex(e) {
    var x = document.getElementById("map");
    var y = document.getElementsByClassName("leaflet-right")[1];
    var keyCode = e.keyCode;
    
    /* on keypress "enter", the focus will jump into the sub-element and changes the tabIndex */
    
    if((keyCode == 13)&& (document.activeElement == x)){
        console.log("enter to map");
        locationTabindex(0);
        document.getElementsByClassName("leaflet-marker-pane")[0].querySelectorAll("img")[0].focus();
    }
    
    else if((keyCode == 13)&& (document.activeElement == y)) {
        console.log("enter to leaflet");
        leafletTabIndex(0);
        document.getElementsByClassName("leaflet-control")[1].querySelectorAll("a")[0].focus();        
    }
};
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

