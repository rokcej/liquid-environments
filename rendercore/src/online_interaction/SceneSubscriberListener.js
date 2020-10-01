
export class SceneSubscriberListener {
	constructor(onConnected, onTerminated, onNewObject) {
		this.onConnected = (onConnected) ? onConnected : function() {};
		this.onTerminated = (onTerminated) ? onTerminated : function() {};
		this.onNewObject = (onNewObject) ? onNewObject : function () {};
	}
};