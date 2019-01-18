# restaurant-reviews ![CI status](https://img.shields.io/badge/development-ongoing-blue.svg)
**The project is a Progressive Web App that meets accessibility standards and provides a responsive user experience and is also accessible for the screen reader user. The project gives a score of more than 90 in terms of Performance, Accessibility and Progressive Web App.

**It communicates with a nodejs backend server and handles asynchronous requests which meets performance standards. The project intensively uses the Fetch API to communicate with the server. You can get the server from [here](https://github.com/udacity/mws-restaurant-stage-3)**

**It also serves review submission on the client side, search capability to the database so that users can store and look at reviews, and leverage offline capabilities so that users will be able write a review "offline" or mark a review or restaurant as a favorite while offline, defering it, and then sent to the server when it's back online. This whole process uses the cache and IndexedDB Promised API to leverage this offline functionality.**

## Requirements
* python 3.0 or higher version
* npm
* sass
* gulp

## Installation
* clone the project
* download the server
* run ```node server``` on the server directory
* run ```python -m http.server 1337``` on the client directory
