/********* jakearchibald promised API  *********
 ********** dbhelper code from line 324 *********/
'use strict';

(function () {
    function toArray(arr) {
        return Array.prototype.slice.call(arr);
    }

    function promisifyRequest(request) {
        return new Promise(function (resolve, reject) {
            request.onsuccess = function () {
                resolve(request.result);
            };

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    function promisifyRequestCall(obj, method, args) {
        var request;
        var p = new Promise(function (resolve, reject) {
            request = obj[method].apply(obj, args);
            promisifyRequest(request).then(resolve, reject);
        });

        p.request = request;
        return p;
    }

    function promisifyCursorRequestCall(obj, method, args) {
        var p = promisifyRequestCall(obj, method, args);
        return p.then(function (value) {
            if (!value) return;
            return new Cursor(value, p.request);
        });
    }

    function proxyProperties(ProxyClass, targetProp, properties) {
        properties.forEach(function (prop) {
            Object.defineProperty(ProxyClass.prototype, prop, {
                get: function () {
                    return this[targetProp][prop];
                },
                set: function (val) {
                    this[targetProp][prop] = val;
                }
            });
        });
    }

    function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function (prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function () {
                return promisifyRequestCall(this[targetProp], prop, arguments);
            };
        });
    }

    function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function (prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function () {
                return this[targetProp][prop].apply(this[targetProp], arguments);
            };
        });
    }

    function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function (prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function () {
                return promisifyCursorRequestCall(this[targetProp], prop, arguments);
            };
        });
    }

    function Index(index) {
        this._index = index;
    }

    proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

    proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

    proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

    function Cursor(cursor, request) {
        this._cursor = cursor;
        this._request = request;
    }

    proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

    proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

    // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
        if (!(methodName in IDBCursor.prototype)) return;
        Cursor.prototype[methodName] = function () {
            var cursor = this;
            var args = arguments;
            return Promise.resolve().then(function () {
                cursor._cursor[methodName].apply(cursor._cursor, args);
                return promisifyRequest(cursor._request).then(function (value) {
                    if (!value) return;
                    return new Cursor(value, cursor._request);
                });
            });
        };
    });

    function ObjectStore(store) {
        this._store = store;
    }

    ObjectStore.prototype.createIndex = function () {
        return new Index(this._store.createIndex.apply(this._store, arguments));
    };

    ObjectStore.prototype.index = function () {
        return new Index(this._store.index.apply(this._store, arguments));
    };

    proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

    proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

    proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

    proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

    function Transaction(idbTransaction) {
        this._tx = idbTransaction;
        this.complete = new Promise(function (resolve, reject) {
            idbTransaction.oncomplete = function () {
                resolve();
            };
            idbTransaction.onerror = function () {
                reject(idbTransaction.error);
            };
            idbTransaction.onabort = function () {
                reject(idbTransaction.error);
            };
        });
    }

    Transaction.prototype.objectStore = function () {
        return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
    };

    proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

    proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

    function UpgradeDB(db, oldVersion, transaction) {
        this._db = db;
        this.oldVersion = oldVersion;
        this.transaction = new Transaction(transaction);
    }

    UpgradeDB.prototype.createObjectStore = function () {
        return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
    };

    proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

    proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

    function DB(db) {
        this._db = db;
    }

    DB.prototype.transaction = function () {
        return new Transaction(this._db.transaction.apply(this._db, arguments));
    };

    proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

    proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

    // Add cursor iterators
    // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function (funcName) {
    [ObjectStore, Index].forEach(function (Constructor) {
            // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
            if (!(funcName in Constructor.prototype)) return;

            Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
                var args = toArray(arguments);
                var callback = args[args.length - 1];
                var nativeObject = this._store || this._index;
                var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
                request.onsuccess = function () {
                    callback(request.result);
                };
            };
        });
    });

    // polyfill getAll
  [Index, ObjectStore].forEach(function (Constructor) {
        if (Constructor.prototype.getAll) return;
        Constructor.prototype.getAll = function (query, count) {
            var instance = this;
            var items = [];

            return new Promise(function (resolve) {
                instance.iterateCursor(query, function (cursor) {
                    if (!cursor) {
                        resolve(items);
                        return;
                    }
                    items.push(cursor.value);

                    if (count !== undefined && items.length == count) {
                        resolve(items);
                        return;
                    }
                    cursor.continue();
                });
            });
        };
    });

    var exp = {
        open: function (name, version, upgradeCallback) {
            var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
            var request = p.request;

            if (request) {
                request.onupgradeneeded = function (event) {
                    if (upgradeCallback) {
                        upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
                    }
                };
            }

            return p.then(function (db) {
                return new DB(db);
            });
        },
        delete: function (name) {
            return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
        }
    };

    if (typeof module !== 'undefined') {
        module.exports = exp;
        module.exports.default = module.exports;
    } else {
        self.idb = exp;
    }
}());

/** End of IndexedDB API script **/
/**
 * Common database helper functions.
 */
class DBHelper {

    /*
     * Database URL.
     * 👍 Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}/restaurants`;
    }
    
    static get Port() {
        const port = 1337;
        return port;
    }

    /**
     * Fetch all restaurants. */

    static fetchRestaurants(callback) {
        /*let xhr = new XMLHttpRequest();
        xhr.open('GET', DBHelper.DATABASE_URL);
        xhr.onload = () => {
          if (xhr.status === 200) { // Got a success response from server!
            const json = JSON.parse(xhr.responseText);
            const restaurants = json.restaurants;
            callback(null, restaurants);
          } else { // Oops!. Got an error from server.
            const error = (`Request failed. Returned status of ${xhr.status}`);
            callback(error, null);
          }
        };
        xhr.send(); 
    
        fetch(DBHelper.DATABASE_URL).then(response => {  
        const restaurants = response.json();
        return restaurants;
        }).then(restaurants=> callback(null, restaurants))
        .catch(e => callback(e, null));
        */
        const dbPromise = DBHelper.openDB();

        DBHelper.getDataFromDb(dbPromise).then((restaurants) => {
            if (restaurants && restaurants.length > 0)
                callback(null, restaurants);
            else
                return fetch(DBHelper.DATABASE_URL);
        }).then(response => {
            if (!response) return;
            return response.json();
        }).then(restaurants => {
            if (!restaurants) return;
            DBHelper.updateDb(restaurants, dbPromise);
            callback(null, restaurants);
        }).catch((er) => {
            const errorMessage = (`promise rejected: ${er}`);
            callback(errorMessage, null);
        });
    }

    // Initialising indexedDB database
    static openDB() {
        return idb.open('mws-rr-db', 2, upgradeDb => {
            switch (upgradeDb.oldVersion) {
                case 0:
                    upgradeDb.createObjectStore('restaurants');
                case 1:
                    const reviewStore = upgradeDb.createObjectStore('reviews',{ keyPath: 'id' });
                    reviewStore.createIndex('restaurant','restaurant_id');//indexname,property
            }
        });
    }

    // Reading data fom indexedDB
    static getDataFromDb(dbPromise) {
        return dbPromise.then(db => {
            let tx = db.transaction('restaurants');
            let keyIdStore = tx.objectStore('restaurants');
            return keyIdStore.get('allRestaurants');
        });
    }

    //updating indexedDB
    static updateDb(restaurants, dbPromise) {
        return dbPromise.then(db => {
            let tx = db.transaction('restaurants', 'readwrite');
            let keyIdStore = tx.objectStore('restaurants');
            keyIdStore.put(restaurants, 'allRestaurants');
            tx.complete;
        }).then(function () {
            console.log('updated values in the database')
        });
    }
    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                } else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }
        });
    }

    /**
     * ☆ Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return (`img/${restaurant.id}.jpg`);
    }

    static imageSrcForRestaurant(restaurant) {
        return (`img/${restaurant.id}.jpg 800w, /img/img-small/${restaurant.id}.jpg 600w`);
    }

    /*
     ** function to update the favorite status and updating the values in indexedDB
     */
    static updateFavourite(id, value) {
        fetch(`${DBHelper.DATABASE_URL}/${id}/?is_favorite=${value}`, {
            method: 'PUT'
        }).catch(error=>{
            console.log("error in updating the value to the server! Maybe you are offline");
        });
        this.openDB().then(db => {
            const txn = db.transaction('restaurants', 'readwrite');
            const restaurantsStore = txn.objectStore('restaurants');
            restaurantsStore.get('allRestaurants').then(restauran => {
                console.log(`changing state to ${value}`);
                //restauran = restauran.find(r => r.id == id);
                restauran[id - 1].is_favorite = value;
                restaurantsStore.put(restauran, 'allRestaurants');
            });
        });
    }
    /**
    * getting all reviews
    **/
    static fetchRestaurantReviews(id, callback) {
        fetch(`http://localhost:${DBHelper.Port}/reviews/?restaurant_id=${id}`)
        .then(response => response.json())
        .then(reviews => {
            this.openDB().then(db => {
                if(!db) return;
                let tx = db.transaction('reviews', 'readwrite');
                const store = tx.objectStore('reviews');
                if(Array.isArray(reviews)) {
                    reviews.forEach(review=>{
                        store.put(review);
                    });
                }
                else {
                store.put(reviews,'restaurant_id');
                }
            });
        console.log('dbhelper reviews: ',reviews);
        return Promise.resolve(reviews);
        })
        .then(data => callback(null, data))
        .catch(error => {
            return DBHelper.getOfflineReviews('reviews', 'restaurant_id', id)
            .then((offlineReviews) => {
                console.log('looking for offline reviews');
                return Promise.resolve(offlineReviews);
            })
            .then(data => callback(null, data));
        });
        //.catch(err => callback(err, null));
      }
    
    /**
     * fetching offline reviews
    **/
    static getOfflineReviews(table, index, id) {
        return this.openDB()
        .then(db=>{
            if(!db) return;
            var tx = db.transaction([table], 'readonly');
            var store = tx.objectStore(table);
            var index = store.index('restaurant_id');
            return index.getAll(id);
        });
    }
    
    /**
     * Updating the db with the new reviews
     **/
    static createNewReview(id, name, rate, comment, callback) {
        const rData = {
            'restaurant_id': id,
            'name': name,
            'rating': rate,
            'comments': comment
        };
        const offlineData = {
            name: 'addReview',
            data: rData,
            object_type: 'review'
        };
        
        if((!navigator.onLine) && (offlineData.name === 'addReview')) {
            DBHelper.sendReviewWhenOnline(offlineData);
            console.log("OFFLINE: sending to local storage")
            return;
        }
        fetch(`http://localhost:${DBHelper.Port}/reviews/`, {
                headers: {
                    "Content-Type": "application/form-data",
                },
                method: "POST", 
                body: JSON.stringify(rData)
            })
            .then(response => response.json())
            .then(rData => callback(null, rData))
            .catch(er => callback(er, null));

    }
    
    static createReviewWhenOnline(offlineData) {
        fetch(`http://localhost:${DBHelper.Port}/reviews/`, {
                headers: {
                    "Content-Type": "application/form-data",
                },
                method: "POST", 
                body: JSON.stringify(offlineData)
            })
            .then(response => response.json());
            window.location.href = `restaurant.html?id=${self.restaurant.id}`;
    }
    /**
    * sending the added review when online
    */
    static sendReviewWhenOnline(offlineData) {
        localStorage.setItem('data', JSON.stringify(offlineData));
        console.log("data stored in local storage");
        window.addEventListener('online', (event)=> {
            console.log("ONLINE: sending the reviews to server");
            let data = JSON.parse(localStorage.getItem('data'));
            
            if(data!== null && (offlineData.name === 'addReview')) {
                console.log("called the methhod")
                DBHelper.createReviewWhenOnline(offlineData.data)
            }
            localStorage.removeItem('data');
        });
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        // https://leafletjs.com/reference-1.3.0.html#marker  
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
            title: restaurant.name,
            alt: restaurant.name,
            url: DBHelper.urlForRestaurant(restaurant)
        })
        marker.addTo(newMap);
        return marker;
    }
    /* static mapMarkerForRestaurant(restaurant, map) {
      const marker = new google.maps.Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP}
      );
      return marker;
    } */

}
