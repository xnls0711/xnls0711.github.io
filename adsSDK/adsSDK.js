/**
  Usage:
  	- Make sure to load ima3 sdk before this script
	  Example: 
	  	if (enableADS)
		{
			loadOrderScript('//imasdk.googleapis.com/js/sdkloader/ima3.js', 'adsSDK/adsSDK.js');            
		}
	- To display ads using playAds() function. Notice After this script loaded it will playAds() automatic for preroll ads
 */

"use strict";
window.reloadAds = true;
var adsContainer; // element in index
var adsDisplayContainer; // ima obj
var adsLoader;
var adsManager;

var vastMediaWidth = -1;
var vastMediaHeight = -1;
var originW = 0;
var originH = 0;

var AdsSize = {
	x: 360,
	y: 640,
}
var adsShowCount = 0;
var MAX_SHOW_ADS_PER_REQUEST = 3;
var AdsState = {
	NONE: 0,
	LOADING: 1,
	LOADED: 2,
	STARTED: 3,
	COMPLETE: 4,
};
var MAX_ERROR_WAIT_TIME = 20;
var errorWaitTime = MAX_ERROR_WAIT_TIME;
var errorWaitTime_adsManager = 2;
var errorTimer;
var totalRequest = 0;
var totalClick = 0;
var isCliked = false;

var adsCurrentState = AdsState.NONE;
var adsConsoleLog = true;
var _defaultAdUrl = '//googleads.g.doubleclick.net/pagead/ads?ad_type=image_flash&client=ca-games-pub-4052078165537812&description_url=https%3A%2F%2Fplay.ludigames.com%2Fdetails%2F' + productKey + '&videoad_start_delay=0&hl=en'
var _loadedAdUrl = null;		// for keep latest adurl that successfull request

var _adsLog = function(message) {
	if(adsConsoleLog) {
		console.log(message);
	}
}

/**
 * private function to change ads state, you can listen this event if need via 'gl_ads_state_change' event
 * you can also access adsCurrentState direct in your code
*/
var _setAdsState = function (state) {
	var oldState = adsCurrentState;
	adsCurrentState = state;
	window.dispatchEvent(new CustomEvent('gl_ads_state_change', { detail: { oldState: oldState, newState: adsCurrentState } }));
}

/**
 * set style fullscreen for ads container
 */
var setFullScreenAdsContainer = function () {
	// var w = window,
		// d = document,
		// e = d.documentElement,
		// g = d.getElementsByTagName('body')[0],
		// x = w.innerWidth || e.clientWidth || g.clientWidth,
		// y = w.innerHeight || e.clientHeight || g.clientHeight;
	adsContainer = document.getElementById('adsContainer');
	//adsContainer.style.position = 'fixed';
	//adsContainer.style.top = "0px";
	//adsContainer.style.left = "0px";
	// adsContainer.style.width = x + 'px';
	// adsContainer.style.height = y + 'px';
	// adsContainer.style.border = 1 + "px";
	adsContainer.style.display = "none"; // none, inline	
}

var createAdDisplayContainer = function () {
	// We assume the adContainer is the DOM id of the element that will house the ads.
	if(adsDisplayContainer == null) {
		adsDisplayContainer = new google.ima.AdDisplayContainer(adsContainer);
		adsDisplayContainer.initialize();
	}
}

function resetAds(){
	if(adsManager){
		try{
			adsManager.destroy();
		}catch(e){
		
		};
	}
	adsManager = null;
	if(adsLoader){
		try{
			adsLoader.destroy();
		}catch(e){
			//console.log(e);
		};
	}
	adsLoader = null;
}

/**
 * playing ads
 */
var playAds = function () {

	// ads still display -> return
	if (adsContainer.style.display == "inline") {
		_adsLog('playAds. adsContainer = inline, return: ');
		return;
	}
	totalRequest += 1;
	clearInterval(errorTimer);
	errorWaitTime = MAX_ERROR_WAIT_TIME;
	errorWaitTime_adsManager = 2;
	isCliked = false;
	_setAdsState(AdsState.LOADING);

	parent['dataLayer'].push({
		'productKey': productKey,
		'event': 'sectionRequestAds',
		'param1': totalRequest
	});
	//if(adsManager == null) {
		adsContainer.style.display = "inline";
	//}
	errorTimer = setInterval(
									adsManager == null ? 
									function() {
									  errorWaitTime-=1;
									  //if(errorWaitTime % 3 == 0)
										//alert("3");
									  if(errorWaitTime < 0){
											//alert("errorWaitTime < 0: showGame");
											adsContainer.style.display = "none";     
											_setAdsState(AdsState.COMPLETE);
											clearInterval(errorTimer);
											errorWaitTime = MAX_ERROR_WAIT_TIME;
											if(!isCliked)
											parent['dataLayer'].push({
												'productKey': productKey,
												'event': 'sectionAdManagerError',
												'param1': "-1000",
												'param2': "-1000," + originW + "x" + originH + "," + AdsSize.x + "x" + AdsSize.y + "," + vastMediaWidth + "x" + vastMediaHeight + "," + totalRequest
											});
											resetAds();
											
										}
									}
									:
									function() {
									  errorWaitTime-=1;
									  errorWaitTime_adsManager -= 1;
									  if(errorWaitTime < 0){
											//alert("errorWaitTime < 0: showGame");
											adsContainer.style.display = "none";     
											_setAdsState(AdsState.COMPLETE);
											clearInterval(errorTimer);
											errorWaitTime = MAX_ERROR_WAIT_TIME;
											if(!isCliked)
											parent['dataLayer'].push({
												'productKey': productKey,
												'event': 'sectionAdManagerError',
												'param1': "-1000", // ima3 unknow error
												'param2': "-1000," + originW + "x" + originH + "," + AdsSize.x + "x" + AdsSize.y + "," + vastMediaWidth + "x" + vastMediaHeight + "," + totalRequest
											});
											resetAds();
											return;
										}
									  if(errorWaitTime_adsManager < 0){
											var remainingTime = 15;
											try{
												remainingTime = adsManager.getRemainingTime();
											}catch(e){
												remainingTime = -1;
											}
											if(remainingTime < 0){
												adsContainer.style.display = "none"; 
												_setAdsState(AdsState.COMPLETE);
												clearInterval(errorTimer);
												errorWaitTime_adsManager = 2;
												if(!isCliked)
												parent['dataLayer'].push({
													'productKey': productKey,
													'event': 'sectionAdManagerError',
													'param1': "-1001",//adsManager.start() error; 
													'param2': "-1001," + originW + "x" + originH + "," + AdsSize.x + "x" + AdsSize.y + "," + vastMediaWidth + "x" + vastMediaHeight + "," + totalRequest
												});
												resetAds();
												return;
											}else{
												errorWaitTime_adsManager = 100;
											}
										}
										
									},
									1000
							);
	// check for cleanup for request
	if(adsManager != null) {
		try{
			adsManager.start();		// play/replay cached ads
			//errorWaitTime_adsManager = 100;
			//adsContainer.style.display = "inline";
			//clearInterval(errorTimer);
		}catch(e){
			adsContainer.style.display = "none";
			clearInterval(errorTimer);
			resetAds();
			
			
		};
		// adsManager.destroy();
		// adsManager = null;
		// adsLoader.contentComplete();	// resets the SDK so the new ad request doesn't look like a duplicate of the previous one.
	} else {	// first time display ads or it failed on previous time
		try{
			vastMediaWidth = -1;
			vastMediaHeight = -1;
			createAdDisplayContainer();
			adsLoader = new google.ima.AdsLoader(adsDisplayContainer);
			// Listen and respond to ads adsJSLoaded and error events.
			adsLoader.addEventListener(
				google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
				onAdsManagerLoaded,
				false);
			adsLoader.addEventListener(
				google.ima.AdErrorEvent.Type.AD_ERROR,
				onAdLoaderError,
				false);

			requestAds();
		}catch(e){
			adsContainer.style.display = "none";
			clearInterval(errorTimer);
			resetAds();
		};
	}

}

/**
 * request ads and caching it. It recomment to call it 1 time only
 */
var requestAds = function() {
	var adsRequest = new google.ima.AdsRequest();
	parent['dataLayer'].push({
		'adNetwork': 'AFG',
		'adPosition': 'pre-roll',
		'adHtmlContainer': 'freeContainer',
		'adDescriptionUrl': 'https%3A%2F%2Fplay.ludigames.com%2Fdetails%2F' + productKey, // URL encoded
		'event': 'displayAd'
	});
	if(parent['adUrl']) {
		parent['adUrl'] = parent['adUrl'].replace("image_text","image");
		_loadedAdUrl = parent['adUrl'];
	}
	adsRequest.adTagUrl = parent['adUrl'] || _loadedAdUrl || _defaultAdUrl;
	_adsLog('requestAds. adTagUrl: ' + adsRequest.adTagUrl);
	
	var w = window,
		d = document,
		e = d.documentElement,
		g = d.getElementsByTagName('body')[0],
		x = w.innerWidth || e.clientWidth || g.clientWidth,
		y = w.innerHeight || e.clientHeight || g.clientHeight;

	originW = x;
	originH = y;
	AdsSize.x = x < 320 ? 320 : x;
	AdsSize.y = y < 320 ? 320 : y;
	adsRequest.linearAdSlotWidth = AdsSize.x;
	adsRequest.linearAdSlotHeight = AdsSize.y;

	adsRequest.nonLinearAdSlotWidth = AdsSize.x;
	adsRequest.nonLinearAdSlotHeight = AdsSize.y;

	adsRequest.forceNonLinearFullSlot = true;

	// set container for real size
	//adsContainer.style.width = x + 'px';
	//adsContainer.style.height = y + 'px';

	adsLoader.requestAds(adsRequest);
}

var onAdsManagerLoaded = function (adsManagerLoadedEvent) {

	adsManager = adsManagerLoadedEvent.getAdsManager(adsDisplayContainer);

	// Add listeners to the required events.
	adsManager.addEventListener(
		google.ima.AdErrorEvent.Type.AD_ERROR,
		onAdManagerError);
	
	var events = [
		google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
		// google.ima.AdEvent.Type.CLICK,
		google.ima.AdEvent.Type.COMPLETE,
		// google.ima.AdEvent.Type.FIRST_QUARTILE,
		google.ima.AdEvent.Type.LOADED,
		// google.ima.AdEvent.Type.MIDPOINT,
		// google.ima.AdEvent.Type.PAUSED,
		google.ima.AdEvent.Type.STARTED,
		// google.ima.AdEvent.Type.THIRD_QUARTILE,
		google.ima.AdEvent.Type.USER_CLOSE,
		google.ima.AdEvent.Type.CLICK
	];

	for (var index in events) {
		adsManager.addEventListener(
			events[index],
			onAdEvent,
			false);
	  }

	try {
		/*var w = window,
			d = document,
			e = d.documentElement,
			g = d.getElementsByTagName('body')[0],
			x = w.innerWidth || e.clientWidth || g.clientWidth,
			y = w.innerHeight || e.clientHeight || g.clientHeight;*/

		_adsLog("playAds (w,h): " + AdsSize.x + ", " + AdsSize.y);
		adsManager.init(AdsSize.x, AdsSize.y, google.ima.ViewMode.FULLSCREEN);
		// set container for real size
		//adsContainer.style.width = x + 'px';
		//adsContainer.style.height = y + 'px';
		// Call play to start showing the ad. Single video and overlay ads will
		// start at this time; the call will be ignored for ad rules.
		adsManager.start();
	} catch(adError) {
		adsContainer.style.display = "none";
		_adsLog("playAds adError: " + adError);
		clearInterval(errorTimer);
		parent['dataLayer'].push({
			'productKey': productKey,
			'event': 'sectionPlayAdsError'
		});
		_setAdsState(AdsState.COMPLETE);
		resetAds();
	}
}

/** ad play event handle */
var onAdEvent = function (adEvent) {
	var ad = adEvent.getAd();
	
	switch (adEvent.type) {
		case google.ima.AdEvent.Type.LOADED:
			// this event is not fire when cached ads play
			vastMediaWidth = ad.getVastMediaWidth();
			vastMediaHeight = ad.getVastMediaHeight();
			_adsLog("onAdEvent LOADED");
			_adsLog("ad.isLinear(): " + ad.isLinear());
			_setAdsState(AdsState.LOADED);; //
			//clearInterval(errorTimer);
			errorWaitTime = MAX_ERROR_WAIT_TIME;
			break;
		case google.ima.AdEvent.Type.STARTED:
			// this event is not fire when cached ads play
			_adsLog("onAdEvent STARTED");
			//clearInterval(errorTimer);
			errorWaitTime = MAX_ERROR_WAIT_TIME;
			_setAdsState(AdsState.STARTED); //
			parent['dataLayer'].push({
				'productKey': productKey,
				'event': 'sectionAdsStarted',
				'param1': totalRequest
			});
			break;
		case google.ima.AdEvent.Type.COMPLETE:
		case google.ima.AdEvent.Type.USER_CLOSE:
			_adsLog("onAdEvent COMPLETE/USER_CLOSE");
			parent['dataLayer'].push({
				'productKey': productKey,
				'event': 'sectionShowAds',
				'param1': totalRequest
			});

			_setAdsState(AdsState.COMPLETE); //		
			adsContainer.style.display = "none";
			clearInterval(errorTimer);
			if(vastMediaWidth <= 0 /*|| isCliked*/)
			{
				adsShowCount = MAX_SHOW_ADS_PER_REQUEST;
			}
			adsShowCount++;
			if(adsShowCount >= MAX_SHOW_ADS_PER_REQUEST)
			{
				adsShowCount = 0;
				resetAds();
			}
			break;
		case google.ima.AdEvent.Type.CLICK:
			clearInterval(errorTimer);
			//errorWaitTime = MAX_ERROR_WAIT_TIME;
			isCliked = true;
			totalClick += 1;
			parent['dataLayer'].push({
			'productKey': productKey,
			'event': 'sectionAdClick',
			'param1': totalRequest,
			'param2': totalClick
			});
			break;
	}
}

/** error handle when request ads */
var onAdManagerError = function (adErrorEvent) {
	// Handle the error logging.
	adsContainer.style.display = "none";
	clearInterval(errorTimer);
	_setAdsState(AdsState.COMPLETE);
	
	parent['dataLayer'].push({
		'productKey': productKey,
		'event': 'sectionAdManagerError',
		'param1': adErrorEvent.getError().getErrorCode(),
		'param2': adErrorEvent.getError().getErrorCode() + "," + originW + "x" + originH + "," + AdsSize.x + "x" + AdsSize.y + "," + vastMediaWidth + "x" + vastMediaHeight + "," + totalRequest
	});
	_adsLog("onAdManagerError " + adErrorEvent.getError());
	resetAds();
}

/** error handle when request ads */
var onAdLoaderError = function (adErrorEvent) {
	// Handle the error logging.
	adsContainer.style.display = "none";
	_setAdsState(AdsState.COMPLETE);
	clearInterval(errorTimer);
	//adsContainer.style.display = "none";
	parent['dataLayer'].push({
		'productKey': productKey,
		'event': 'sectionAdLoaderError',
		'param1': adErrorEvent.getError().getErrorCode()
	});
	_adsLog("onAdLoaderError " + adErrorEvent.getError());
	resetAds();
}

/**
 * init ads sdk
 */
var _initialize = function () {
	setFullScreenAdsContainer();
}

_initialize();
_adsLog("adsSDK v005 loaded");


playAds();
