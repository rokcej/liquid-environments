/**
 * Created by Primoz Lavric on 21-May-17.
 */

import {singleton, singletonEnforcer} from '../constants.js';
import {SocketSubscriber} from './SocketSubscriber.js';

export class SocketManager {
	constructor(enforcer) {
		if(enforcer != singletonEnforcer) {
			throw "Cannot construct singleton";
		}

		this._socket = null;
		this._settings = SocketManager.DEFAULT_SETTINGS;

		// Subscribers
		this._socketSubscribers = [];

		// Does not necessarily mean that the socket is connected
		this.connectionOpen = false;
	}

	connectToServer() {
		if (this.connectionOpen) {
			console.warn("Tried to connect to the server with the connection already opened.");
			return;
		}

		this.connectionOpen = true;

		let self = this;

		this._socket = io(this._settings);

		// Add the wildcard option to the sockets
		let onevent = this._socket.onevent;
		this._socket.onevent = function (packet) {
			let args = packet.data || [];
			onevent.call (this, packet);    // original call
			packet.data = ["*"].concat(args);
			onevent.call(this, packet);      // additional call to catch-all
		};

		// Forward connect and disconnect events
		this._socket.on('connect', function() {
			for (let i = 0; i < self._socketSubscribers.length; i++) {
				if (self._socketSubscribers[i].onConnectionStateChange != null) {
					self._socketSubscribers[i].onConnectionStateChange(SocketSubscriber.CONNECTED);
				}
			}
		});

		this._socket.on('disconnect', function() {
			for (let i = 0; i < self._socketSubscribers.length; i++) {
				if (self._socketSubscribers[i].onConnectionStateChange != null) {
					self._socketSubscribers[i].onConnectionStateChange(SocketSubscriber.DISCONNECTED);
				}
			}
		});

		// On new data received notify the subscribers
		this._socket.on("*", function(channel, data) {
			for (let i = 0; i < self._socketSubscribers.length; i++) {
				if (self._socketSubscribers[i].hasEventCallback(channel)) {
					self._socketSubscribers[i].getEventCallback(channel)(data);
				}
			}
		});
	}

	emit(channel, data, callback) {
		if (callback == null) {
			this._socket.emit(channel, data);
		}
		else {
			this._socket.emit(channel, data, callback);
		}
	}

	// Socket subscriber management
	addSocketSubscriber(subscriber) {
		this._socketSubscribers.push(subscriber);
	}

	rmSocketSubscriber(subscriber) {
		let index = this._socketSubscribers.indexOf(subscriber);

		if (index > -1) {
			this._socketSubscribers.splice(index, 1);
		}
	}

	get isConnectionOpen() {
		return this.connectionOpen;
	}

	// Get socket manager instance
	static get instance() {
		if(!this[singleton]) {
			this[singleton] = new SocketManager(singletonEnforcer);
		}
		return this[singleton];
	}
};

SocketManager.DEFAULT_SETTINGS = {transports: ["websocket", "pooling"], perMessageDeflate: {threshold: 1024}};


