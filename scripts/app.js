// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    accuWeatherApiId: accuWeatherApiKey,
    initialData: initialData
  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/
  
  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    if (!app.selectedCities) {
      app.selectedCities = [];
    }
    app.getForecast(key, label);
    app.selectedCities.push({key: key, label: label});
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    var dataLastUpdated = new Date(data.created);
    var sunrise = data.channel.astronomy.sunrise;
    var sunset = data.channel.astronomy.sunset;
    var current = data.channel.item.condition;
    var humidity = data.channel.atmosphere.humidity;
    var wind = data.channel.wind;

    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      var dataTime = dataLastUpdated.getTime();
      var cardTime = cardLastUpdated.getTime();
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;
    card.querySelector('.description').textContent = current.text;
    card.querySelector('.date').textContent = current.date;
    card.querySelector('.current .icon').classList.add(app.getIconClass(current.code));
    card.querySelector('.current .temperature .value').textContent =
      Math.round(current.temp);
    card.querySelector('.current .sunrise').textContent = sunrise;
    card.querySelector('.current .sunset').textContent = sunset;
    card.querySelector('.current .humidity').textContent =
      Math.round(humidity) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(wind.speed);
    card.querySelector('.current .wind .direction').textContent = wind.direction;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 4; i++) {
      var nextDay = nextDays[i];
      var daily = data.channel.item.forecast[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.code));
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.high);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.low);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getForecast() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getForecast() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getForecast = function(key, label) {
    // var statement = 'select * from weather.forecast where woeid=' + key;
    // var url = 'https://query.yahooapis.com/v1/public/yql?format=json&q=' +
    //     statement;
    var statement = key + '?apikey=' + app.accuWeatherApiId + '&details=true';
    var url = 'https://dataservice.accuweather.com/forecasts/v1/daily/5day/' +
        statement;
    // TODO add cache logic here
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(url).then(function(response) {
        if (response) {
          console.log('cache with response', url); 
          response.json().then(function updateFromCache(response) {
            var results = app.accuweatherWrapper(response, key, label);
            app.updateForecastCard(results);
          });
        } 
      }).catch(function(err) {
        return new Error(err);
      });
    };
    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
          var response = JSON.parse(request.response);
          var results = app.accuweatherWrapper(response, key, label);
          app.updateForecastCard(results);
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateForecastCard(initialWeatherForecast);
      }
    };
    request.open('GET', url);
    request.send();
  };
  // Wrap accuweather response to correct format
  app.accuweatherWrapper = function(response, key, label) {
    var results = {};
    results.key = key;
    results.label = label;
    results.created = new Date(response.DailyForecasts[0].Date); // convert to milliseconds!
    results.channel = {};
    results.channel.astronomy = {};
    results.channel.item = {};
    results.channel.item.condition = {};
    results.channel.item.forecast = [];
    results.channel.atmosphere = {};
    results.channel.wind = {};

    var today = response.DailyForecasts[0];
    results.channel.astronomy.sunrise = new Date(today.Sun.Rise).toLocaleTimeString();
    results.channel.astronomy.sunset = new Date(today.Sun.Set).toLocaleTimeString();
    results.channel.item.condition.text = today.Day.IconPhrase;
    results.channel.item.condition.date = new Date(today.Date).toDateString() + " " + new Date(today.Date).toTimeString();
    results.channel.item.condition.temp = today.Temperature.Maximum.Value;
    results.channel.item.condition.code = today.Day.Icon;
    for (var i = 0; i < response.DailyForecasts.length - 1; i++) {
      results.channel.item.forecast[i] = {};
      results.channel.item.forecast[i].code = response.DailyForecasts[i + 1].Day.Icon;
      results.channel.item.forecast[i].high = response.DailyForecasts[i + 1].Temperature.Maximum.Value;
      results.channel.item.forecast[i].low = response.DailyForecasts[i + 1].Temperature.Minimum.Value;
    }
    results.channel.atmosphere.humidity = 50;
    results.channel.wind.speed = today.Day.Wind.Speed.Value;
    results.channel.wind.direction = today.Day.Wind.Direction.Degrees;
    return results
  }
  
  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // TODO add saveSelectedCities function here
  app.saveSelectedCities = function() {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };


  app.getIconClass = function(weatherCode) {
    // Weather codes: https://developer.accuweather.com/weather-icons
    weatherCode = parseInt(weatherCode);
    switch (weatherCode) {
      case 1: //Sunny
      case 2: //Mostly Sunny
      case 3: //Partly Sunny
      case 4: //Intermittent Clouds
      case 30: //Hot
      case 31: //Cold
      case 33: //Clear
      case 34: //Mostly Clear
        return 'clear-day';

      case 12: //Showers
      case 13: //Mostly Cloudy w/ Showers
      case 14: //Partly Sunny w/ Showers
      case 18: //Rain
      case 26: //Freezing Rain
      case 39: //Partly Cloudy w/ Showers
      case 40: //Mostly Cloudy w/ Showers
        return 'rain';

      case 15: //T-Storms
      case 16: //Mostly Cloudy w/ T-Storms
      case 17: //Partly Sunny w/ T-Storms
      case 41: //Partly Cloudy w/ T-Storms
      case 42: //Mostly Cloudy w/ T-Storms
        return 'thunderstorms';

      case 19: //Flurries
      case 20: //Mostly Cloudy w/ Flurries
      case 21: //Partly Sunny w/ Flurries
      case 22: //Snow
      case 23: //Mostly Cloudy w/ Snow
      case 24: //Ice
      case 25: //Sleet
      case 29: //Rain and Snow
      case 43: //Mostly Cloudy w/ Flurries
      case 44: //Mostly Cloudy w/ Snow
        return 'snow';

      case 5: //Hazy Sunshine
      case 11: //Fog
        return 'fog';

      case 32: //Windy
        return 'windy';

      case 6: //Mostly Cloudy
      case 7: //Cloudy
      case 8: //Dreary (Overcast)
      case 37: //Hazy Moonlight
      case 38: //Mostly Cloudy
        return 'cloudy';

      case 35: //Partly Cloudy
      case 36: //Intermittent Clouds
        return 'partly-cloudy-day';
    }
  };

  
   /*
   * Fake weather data saved in initialData.js. Used when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  let initialWeatherForecast = app.accuweatherWrapper(app.initialData, '349727', 'New York, NY')
  
  // TODO uncomment line below to test app with fake data
  // app.updateForecastCard(initialWeatherForecast);

  // TODO add startup code here
  app.selectedCities = localStorage.selectedCities;
  if (app.selectedCities) {
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(function(city) {
      app.getForecast(city.key, city.label);
    });
  } else {
    /* The user is using the app for the first time, or the user has not
     * saved any cities, so show the user some fake data. A real app in this
     * scenario could guess the user's location via IP lookup and then inject
     * that data into the page.
     */
    app.updateForecastCard(initialWeatherForecast);
    app.selectedCities = [
      {key: initialWeatherForecast.key, label: initialWeatherForecast.label}
    ];
    app.saveSelectedCities();
  }



  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
  });
  document.querySelector('#butAddToHome').addEventListener("click", function(e) {
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
          this.style.display = 'none';
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        deferredPrompt = null;
      });
  })
  // TODO add service worker code here
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }

})();
