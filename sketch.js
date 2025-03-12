let sizes = [];
let cols, rows, size = 5;
let xoff = 0, yoff = 0, inc = 0.1;
let zoff = 0;
let sketchCanvas;
let radius = 100;

// Color variables
let currentColors = { r: 100, g: 150, b: 200 };
let targetColors = { r: 100, g: 150, b: 200 };
let colorTransition = 0;
let isTransitioning = false;
let transitionSpeed = 0.05;

// Noise variables
let noiseScale = 1.0;
let zoffSpeed = 0.008;

function setup() {
  sketchCanvas = createCanvas(200, 200);
  sketchCanvas.parent('sketchContainer');
  rectMode(CENTER);
  cols = width/size;
  rows = height/size;
}

function draw() {
  background(220);
  xoff = 0;
  
  // Handle color transitions
  if (isTransitioning) {
    colorTransition += transitionSpeed;
    
    if (colorTransition >= 1) {
      colorTransition = 0;
      currentColors = {...targetColors};
      isTransitioning = false;
    }
  }
  
  // Always move noise at the same slow speed
  zoff += zoffSpeed;
  
  // Calculate interpolated colors
  let r = isTransitioning ? 
    lerp(currentColors.r, targetColors.r, colorTransition) : 
    currentColors.r;
  let g = isTransitioning ? 
    lerp(currentColors.g, targetColors.g, colorTransition) : 
    currentColors.g;
  let b = isTransitioning ? 
    lerp(currentColors.b, targetColors.b, colorTransition) : 
    currentColors.b;
  
  // Translate to center of canvas
  translate(width/2, height/2);
  
  for (let i = 0; i < cols; i++) {
    sizes[i] = [];
    yoff = 0;
    for (let j = 0; j < rows; j++) {
      // Calculate position in grid
      let x = size/2 + i*size - width/2;
      let y = size/2 + j*size - height/2;
      
      // Calculate distance from center
      let distance = sqrt(x*x + y*y);
      
      // Only draw if inside the circle
      if (distance < radius) {
        sizes[i][j] = map(noise(xoff * noiseScale, yoff * noiseScale, zoff), 0, 1, 0, size*1.7);
        
        // Use the interpolated colors
        fill(r, g, b);
        noStroke();
        rect(x, y, sizes[i][j], sizes[i][j]);
      }
      
      yoff += inc;
    }
    xoff += inc;
  }
}

// Function to update the visualization when a new chord is played
window.updateVisualization = function(chordName) {
  let chordSum = 0;
  for (let i = 0; i < chordName.length; i++) {
    chordSum += chordName.charCodeAt(i);
  }
  
  targetColors = {
    r: 50 + (chordSum % 150),
    g: 50 + ((chordSum * 1.5) % 150),
    b: 50 + ((chordSum * 2.7) % 150)
  };
  
  isTransitioning = true;
  colorTransition = 0;
}