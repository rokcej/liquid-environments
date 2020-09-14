# Real-time Rendering of Liquid Environments

This project was developed for my Bachelor's thesis. A live demo of the application is available [here](https://rokcej.github.io/).

## Abstract 

This thesis presents a way of rendering scenes that are completely submerged in liquids, also referred to as liquid environments.
Liquids are the source of unique optical and physical phenomena such as light scattering, light extinction, turbulent flow, and the presence of foreign particles.
Each phenomenon is approached separately, using various techniques to create a visual effect that approximates it.
These effects are then combined into a generalized model, which can simulate the appearance of liquid environments with configurable physical properties.
The model is implemented in a platform-independent manner using JavaScript and WebGL.
Additionally, it achieves interactive performance by heavily utilizing graphical hardware, making it suitable for real-time applications.
A performance evaluation is also done, comparing the computational cost of each effect, as well as the complete model in practical situations.

## Examples

The following images were generated using this model.

![Clear water example](examples/bunny_water.jpg "Bunnies in clear water")

![Dirty water example](examples/bunny_swamp.jpg "Bunnies in dirty water")

![Snow example](examples/bunny_snow.jpg "Bunnies in snow")

![Smoke example](examples/dragon.jpg "Dragon in smoke")
