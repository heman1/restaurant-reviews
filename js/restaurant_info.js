let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(`url is ${restaurant}error at initmap : ${error}`);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } 
  else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = "image of "+restaurant.name+" restaurant";

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
    
  // favourite marker
  const fav = document.getElementById('fav');
  fav.innerHTML = '🟊'; //character for star (may not appear on your editor)
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
  fav.onkeypress = function(e){
      if(e.keyCode===13)
        changeState();
      else
        return;
  };
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
  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchRestaurantReviews(restaurant.id, fillReviewsHTML);
  //fillReviewsHTML();
}
/*
** popup
*/
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
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (error, reviews) => {
  //self.restaurant.reviews = reviews;
  if(error)
      console.log("error in getting reviews "+error);
  else {
  console.log('infojs reviews '+reviews);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
   
  /* calling function to give tabIndexes to elements */
  updateTabindex2();
  }
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.classList.add('rName');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.classList.add('rDate');
  const createdDate = new Date(review.createdAt).toLocaleDateString();
  date.innerHTML = `Made on ${createdDate}`;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.classList.add('star'+review.rating);
  rating.title = 'Rating '+review.rating;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);
    
  return li;
}
 
/* creates add review form */
addReview = () => {
    const name = document.querySelector('.getName').value;
    const rate = document.querySelector('.getRate').value;
    const comment = document.querySelector('.getComment').value;
    console.log(name+" "+rate+" "+comment);
    
    const reviewObj = {
        restaurant_id: parseInt(self.restaurant.id),
        rating: parseInt(rate),
        name: name,
        comments: comment,
        createdAt: new Date()
    }
    const ul = document.getElementById('reviews-list');
    ul.appendChild(createReviewHTML(reviewObj));
    DBHelper.createNewReview(self.restaurant.id, name, rate, comment, (error, review)=> {
        if(error)
            console.log('error in adding review');
        else {
            console.log('review added');
            window.location.href = `restaurant.html?id=${self.restaurant.id}`;
        }
    });
}

/* function to assighn tabindexes */

function updateTabindex2() {
    document.getElementById("restaurant-address").setAttribute("tabindex" ,"0");
    
    /* assigning tabindex 0 to tables in restaurant hours */
    var x = document.getElementById("restaurant-hours").querySelectorAll("tr");
    for( var i=0 ; i < x.length ; i++ ) {
        x[i].setAttribute("tabindex", "0");
    }
    
    /* assigning tabindex 0 to reviews list */
    var y = document.getElementById("reviews-list").querySelectorAll("li");
    for( var i=0 ; i < y.length ; i++ ) {
        y[i].setAttribute("tabindex", "0");
    }    
} 

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.append(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
