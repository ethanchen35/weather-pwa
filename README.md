# Weather PWA
A weather PWA (Progressive Web App) developed based on Google Codelabs demo project.
https://github.com/googlecodelabs/your-first-pwapp

## Get Started
This repository uses AccuWeather API for weather data. You will need to:
1. Register for [AccuWeather API](https://developer.accuweather.com/) account to get AccuWeather API Key.
2. Create new JavaScript file "accuWeatherApiKey.js" in "scripts" folder of the repository root directory.
3. Add line ```var accuWeatherApiKey = '';``` in accuWeatherApiKey.js.
4. Copy and paste your AccuWeather API Key into the quote of the above line.

## Requirement
To run this Weather PWA on a simple local HTTP server, you will need to have Python installed. 

If you are using Linux or macOS, it should be available on your system already. If you are a Windows user, you can get an installer from the [Python homepage](https://www.python.org/downloads/).

Detail instructions can be found [here](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/set_up_a_local_testing_server).

## Run
To run this Weather PWA:
1. Navigate to the repository root directory in command line.
2. Start a simple local HTTP server using the following command from your working directory:
    * Python 2.x: ```python -m SimpleHTTPServer 8000```
    * Python 3.x: ```python -m http.server 8000```
3. Load the URL http://localhost:8000 into your browser.

## Features
  * Query weather data with reliable, fast, and engaging user experience.
  * Utilized Service Worker for cache management.
  * Applied different caching strategies (e.g. cache falling back to network, stale-while-revalidate) for different scenario.
  * One-click away to install app onto Chrome home screen.
