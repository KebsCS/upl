import * as upl from 'upl';

export function init(context: any) {
	// Initialize the UPL context
	upl.init(context);

	/*
        WebSocket Hooks
    */

	// Hook a WebSocket event to modify the challenge score when hovering over a friend in the friends list
	// Using a regex pattern to match all friends, as the endpoint includes a player unique id - '/lol-challenges/v1/summary-player-data/player/{puuid}'
	upl.hooks.ws.hookEvent(/\/lol-challenges\/v1\/summary-player-data\/player\/.*/, (eventType, endpoint, content, original) => {
		console.log(`Received WebSocket message: ${eventType} ${endpoint}`);

		// The content is a JSON, modify it
		content.totalChallengeScore = '99999';

		// Call the original function to proceed with the modified content
		original(content);
	});

	// You can also hook entire WebSocket messages with LCU event types, like 'OnJsonApiEvent'
	// However, this is not necessary, and it's easier to use hookEvent for WebsSocket hooking
	// upl.hooks.ws.hookMessage(/\/lol-lobby\/.*/, (endpoint, payload, original) => {
	//     console.log(`Received WebSocket message: ${endpoint} ${payload}`);
	//     original(payload);
	// });


	/*
        XHR Hooks
    */

	// Hook text XHR requests using hookTextPost
	// It is possible to use regex patterns to match multiple endpoints
	// This example uses a regex to disable all 'lol-store' requests, preventing the store from loading
	upl.hooks.xhr.hookTextPost(/.*\/lol-store\/.*/, (method, endpoint, xhr, original) => {
		console.log(`Blocked XHR request: ${method} ${endpoint}`)

		// Simply returning without calling the original function prevents the response from reaching the client
		return;
	});

	// Hook an XHR request with hookPre to modify it before it's sent
	// This code forces the status to always be set to offline when pressing on the availability button
	upl.hooks.xhr.hookPre('/lol-chat/v1/me', (method, endpoint, xhr, body, original) => {
		console.log(`XHR request: Method - ${method}, Endpoint - ${endpoint}, XHR - ${xhr}, Body - ${body}`);

		// Check if the method is POST or PUT and the body is a string (for JSON parsing)
		if ((method === 'POST' || method === 'PUT') && typeof body === 'string') {
			console.log(`${endpoint} Original request body: ${body}`);

			// Parse the request body to JSON, modify the availability status to offline
			let jsonObject = JSON.parse(body);
			jsonObject.availability = "offline";
			body = JSON.stringify(jsonObject);

			console.log(`${endpoint} Modified request body: ${body}`);
		}
		else {
			// GET method doesn't have a body, if you want to modify all of '/lol-chat/v1/me', hookPost and modify the response body
		}

		// Call the original function to execute the request
		// If the original function isn't called, the request will not be sent
		original(body);
	});

	// Hook XHR requests with hookPost to modify the responses
	upl.hooks.xhr.hookPost('/deep-links/v1/settings', (method, endpoint, xhr, original) => {
		console.log(`XHR request to ${endpoint}:`, xhr);

		// Modify the response to disable the Legends of Runeterra (LoR) button
		const modifiedResponse = JSON.stringify({
			externalClientScheme: 'riotclient',
			isSchemeReady: true,
			launchLorEnabled: false,    // false to disable the button, true to enable it
			launchLorUrl: '/product/launch/v1/bacon'
		});

		// Override the response text with the modified response
		Object.defineProperty(xhr, 'responseText', { writable: true, value: modifiedResponse });

		// Call the original function to send the response to client
		// If the original function isn't called, the request will not be sent to the client
		// In this case, not calling original() will also hide the LoR button
		original();
	});


	/*
        Fetch Hooks
    */

	// To distinguish if a request is xhr, or fetch, check it in the Network tab in dev tools (Ctrl+Shift+I)


	/*
        Ember Hooks
    */

	// Hook 'runTask' method to set ARAM champion bench swap delay to 0
	// Function adapted from: https://github.com/BakaFT/BenchKiller
	function hookRunTask(componentName: string) {
		upl.hooks.ember.hookComponentMethodByName(componentName, 'runTask', (ember, original, ...args) => {
			console.log(`Hooked runTask in ${componentName} component.`, args);

			// Set delay to 0 if applicable
			if (args.length > 1) {
				args[1] = 0;
			}

			return original(...args);
		});
	}
	// The hooked component is found in 'rcp-fe-lol-champ-select.js' LCU plugin
	// This and other plugins extracted from the client can be found at: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/
	// The plugin's code includes 's.Ember.Component.extend' and 'classNames:["champion-bench-item"]' just below it
	// This is why we are hooking an Ember component, as indicated by the method name 'hookComponentMethodByName'
	// In that component, there is a function named `runTask` that handles the swap cooldown animations (as of patch 14.20)

	// Apply 'runTask' hook for both 'champion-bench' and 'champion-bench-item'
	hookRunTask('champion-bench');
	hookRunTask('champion-bench-item');

	// Hook the 'init' method of an Ember service in 'rcp-fe-lol-skins-picker.js'
	// In the plugin's code, the function is under 'S.extend', where 'S' is 'Service: S'
	const skinPickerMatcher = (obj: any) => {
		// This matcher finds services that have these properties: 'groupingSortingState', 'allStoreSkins', etc.
		const matcher = obj.groupingSortingState !== undefined && obj.allStoreSkins !== undefined && obj.skinFilter !== undefined && obj.skinData !== undefined;
		if (matcher) { console.log("Found skinPickerMatcher service"); }
		return matcher
	}
	// Hook the 'init' method inside the found Ember service
	// This function is called when the profile background editor opens for the first time after switching to profile tab
	upl.hooks.ember.hookServiceMethodByMatching(skinPickerMatcher, 'init', (ember, original, ...args) => {
		original(...args);
		console.log("Opened background skin picker");
	});

	// Disables the 'shouldShowPlayButton' property for all matching services
	// The property is found in 'rcp-fe-ember-libs.js' under 'i.Service.extend'
	// This uses extend to modify the property of existing services rather than hooking a function
	upl.hooks.ember.extendServiceByMatching(
		(service) => service.shouldShowPlayButton !== undefined, // matcher
		(ember) => ({
			shouldShowPlayButton: false, // disable the Play button
		})
	);

}