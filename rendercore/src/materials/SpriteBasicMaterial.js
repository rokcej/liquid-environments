import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {Vector3} from '../math/Vector3.js';


export class SpriteBasicMaterial extends CustomShaderMaterial {
    constructor(){
        super();

        this.type = "SpriteBasicMaterial";
        this.programName = "basic_sprite";
        this.color = new Color(Math.random() * 0xffffff);
        this._spriteSize = new Vector3(1, 1, 1);
    }


    get spriteSize() { return this._spriteSize; }
    set spriteSize(val) {
		if (!val.equals(this._spriteSize)) {
			this._spriteSize = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {spriteSize: this._spriteSize}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
    get color() { return this._color; }
    set color(val) {
        this._color = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }


    update(data) {
        super.update(data);

        for (let prop in data) {
            switch (prop) {
                case "color":
                    this._color = data.color;
                    delete data.color;
                    break;
                case "spriteSize":
                    this._spriteSize = data.spriteSize;
                    delete data.spriteSize;
                    break;
            }
        }
    }
}