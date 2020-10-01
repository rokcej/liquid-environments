export class SocketSubscriber {
	constructor(connStateCallback) {
		this._connStateCallback = (connStateCallback != null) ? connStateCallback : null;

		this._eventCallbacks = {};
		this._eventNames = new Set();
	}

	onConnectionStateChange(state) {
		if (this._connStateCallback != null) {
			this._connStateCallback(state);
		}
	}

	addEventCallback(eventName, callback) {
		this._eventCallbacks[eventName] = callback;
		this._eventNames.add(eventName);
	}

	rmEventCallback(eventName) {
		delete this._eventCallbacks[eventName];
		this._eventNames.delete(eventName);
	}

	hasEventCallback(eventName) {
		return this._eventNames.has(eventName);
	}

	getEventCallback(eventName) {
		return this._eventCallbacks[eventName];
	}
};

SocketSubscriber.CONNECTED = 0;
SocketSubscriber.DISCONNECTED = 1;
