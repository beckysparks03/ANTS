// GENERATIVE ANT SWARM
// p5.js 2.3.1
//
// Ants enter individually from different edges.
// They crawl together to create irregular,
// continuously changing flowing lines.
//
// TOUCH / DRAG:
// Frighten nearby ants.
// They gradually return to the swarm.

let ants = [];

let targetAntCount = 90;
let spawnedAntCount = 0;

const flowLineCount = 4;

let nextSpawnTime = 0;
let lastEntrySide = "";

let touchPosition;
let touchStrength = 0;

const backgroundColour = "#FFFFFF";
const antColour = "#29140D";
const fireAntRed = "#9F241B";

function setup() {
  createCanvas(windowWidth, windowHeight);

  pixelDensity(min(pixelDensity(), 2));

  strokeCap(ROUND);
  strokeJoin(ROUND);

  touchPosition = createVector(-1000, -1000);

  calculateAntCount();

  nextSpawnTime = millis() + 180;
}

function draw() {
  background(backgroundColour);

  updateSpawner();
  updateTouchStrength();

  for (let ant of ants) {
    ant.updateSwarmTarget();
  }

  for (let ant of ants) {
    ant.update();
    ant.display();
  }
}

// --------------------------------------------------
// ANT COUNT
// --------------------------------------------------

function calculateAntCount() {
  targetAntCount = floor(constrain((width * height) / 2000, 220, 390));
}

// --------------------------------------------------
// SPAWNING
// --------------------------------------------------

function updateSpawner() {
  if (millis() < nextSpawnTime) {
    return;
  }

  const isReplacingAnt = ants.length >= targetAntCount;

  if (isReplacingAnt) {
    const exitingAntIndex = ants.findIndex((ant) => ant.hasLeftCanvas());

    if (exitingAntIndex === -1) {
      nextSpawnTime = millis() + 100;
      return;
    }

    ants.splice(exitingAntIndex, 1);
  }

  spawnAnt();

  nextSpawnTime =
    millis() + (isReplacingAnt ? random(180, 300) : random(35, 75));
}

function spawnAnt() {
  const entrySide = chooseEntrySide();

  const entryPosition = getRandomEdgePosition(entrySide);

  const slotIndex = spawnedAntCount % targetAntCount;
  const flowLine = slotIndex % flowLineCount;
  const antsPerLine = ceil(targetAntCount / flowLineCount);
  const slotProgress =
    floor(slotIndex / flowLineCount) / antsPerLine + random(-0.008, 0.008);

  const newAnt = new Ant(
    entryPosition.x,
    entryPosition.y,
    slotProgress,
    spawnedAntCount,
    flowLine,
  );

  ants.push(newAnt);

  spawnedAntCount++;
}

function chooseEntrySide() {
  const sideNames = ["left", "right", "top", "bottom"];

  let chosenSide = random(sideNames);

  // Discourage consecutive ants from
  // entering from the same side.

  if (chosenSide === lastEntrySide && random() < 0.9) {
    const otherSides = sideNames.filter((side) => side !== lastEntrySide);

    chosenSide = random(otherSides);
  }

  lastEntrySide = chosenSide;

  return chosenSide;
}

function getRandomEdgePosition(sideName) {
  const outsideAmount = random(25, 55);

  if (sideName === "left") {
    return createVector(-outsideAmount, random(30, height - 30));
  }

  if (sideName === "right") {
    return createVector(width + outsideAmount, random(30, height - 30));
  }

  if (sideName === "top") {
    return createVector(random(30, width - 30), -outsideAmount);
  }

  return createVector(random(30, width - 30), height + outsideAmount);
}

// --------------------------------------------------
// SWARM FLOW
// --------------------------------------------------

function getSwarmPosition(progress, laneOffset = 0, flowLine = 0) {
  const safeProgress = constrain(progress, 0, 1);
  const flowTime = frameCount * 0.001;
  const linePosition = flowLine - (flowLineCount - 1) / 2;
  const linePhase = flowLine * 1.41;
  const broadBend =
    sin(safeProgress * TWO_PI * 1.15 + linePhase + flowTime) * height * 0.13;
  const shortBend =
    sin(safeProgress * TWO_PI * 3.2 - linePhase - flowTime * 0.7) *
    height *
    0.055;
  const organicDrift = map(
    noise(safeProgress * 4.2 + flowLine * 8.1, flowTime * 0.45),
    0,
    1,
    -height * 0.035,
    height * 0.035,
  );

  return createVector(
    lerp(-width * 0.1, width * 1.1, safeProgress) +
      sin(safeProgress * TWO_PI * 1.8 + linePhase) * width * 0.022,
    height * 0.5 +
      linePosition * height * 0.18 +
      broadBend +
      shortBend +
      organicDrift +
      laneOffset,
  );
}

// --------------------------------------------------
// TOUCH INTERACTION
// --------------------------------------------------

function disturbSwarm(interactionX, interactionY) {
  touchPosition.set(interactionX, interactionY);

  touchStrength = 1;

  for (let ant of ants) {
    const differenceVector = p5.Vector.sub(ant.position, touchPosition);

    if (differenceVector.mag() < 170) {
      ant.fleeFrom(touchPosition);
    }
  }
}

function updateTouchStrength() {
  touchStrength *= 0.9;

  if (touchStrength < 0.01) {
    touchStrength = 0;
  }
}

function mousePressed() {
  disturbSwarm(mouseX, mouseY);

  return false;
}

function mouseDragged() {
  disturbSwarm(mouseX, mouseY);

  return false;
}

function touchStarted() {
  if (touches.length > 0) {
    disturbSwarm(touches[0].x, touches[0].y);
  }

  return false;
}

function touchMoved() {
  if (touches.length > 0) {
    disturbSwarm(touches[0].x, touches[0].y);
  }

  return false;
}

// --------------------------------------------------
// ANT CLASS
// --------------------------------------------------

class Ant {
  constructor(antX, antY, slotProgress, antIndex, flowLine) {
    this.position = createVector(antX, antY);

    this.slotProgress = constrain(slotProgress, 0, 1);

    this.pathProgress = this.slotProgress;

    this.pathDirection = random() < 0.5 ? -1 : 1;

    this.index = antIndex;

    this.flowLine = flowLine;

    this.laneOffset = randomGaussian() * 6;

    this.target = getSwarmPosition(
      this.slotProgress,
      this.laneOffset,
      this.flowLine,
    );

    this.heading = atan2(
      this.target.y - this.position.y,

      this.target.x - this.position.x,
    );

    this.targetHeading = this.heading;

    this.walkSpeed = random(0.48, 0.88);

    this.currentSpeed = 0;

    this.turnSpeed = random(0.035, 0.067);

    this.pathSpeed = random(0.00035, 0.0007);

    this.size = random(0.72, 0.92);

    this.walkCycle = random(TWO_PI);

    this.noiseOffset = random(1000);

    this.arrived = false;
    this.isLeaving = false;

    this.pauseTimer = 0;
    this.fleeTimer = 0;

    this.fleeHeading = this.heading;
  }

  // ------------------------------------------------
  // SWARM TARGET
  // ------------------------------------------------

  updateSwarmTarget() {
    const targetDistance = p5.Vector.dist(this.position, this.target);

    if (!this.arrived && targetDistance < 24) {
      this.arrived = true;

      this.pathProgress = this.slotProgress;
    }

    if (
      this.arrived &&
      !this.isLeaving &&
      this.fleeTimer <= 0 &&
      this.pauseTimer <= 0
    ) {
      this.pathProgress += this.pathSpeed * this.pathDirection;

      // Continue beyond the canvas at either
      // end, then make room for a new arrival.

      if (this.pathProgress >= 1) {
        this.pathProgress = 1;
        this.isLeaving = true;
      }

      if (this.pathProgress <= 0) {
        this.pathProgress = 0;
        this.isLeaving = true;
      }
    }

    const targetProgress = this.arrived ? this.pathProgress : this.slotProgress;

    this.target = getSwarmPosition(
      targetProgress,
      this.laneOffset,
      this.flowLine,
    );
  }

  hasLeftCanvas() {
    const outsideMargin = 35;

    return (
      this.isLeaving &&
      (this.position.x < -outsideMargin ||
        this.position.x > width + outsideMargin ||
        this.position.y < -outsideMargin ||
        this.position.y > height + outsideMargin)
    );
  }

  // ------------------------------------------------
  // MOVEMENT
  // ------------------------------------------------

  update() {
    this.updatePause();

    let desiredDirection = p5.Vector.sub(this.target, this.position);

    if (desiredDirection.mag() > 0) {
      desiredDirection.normalize();
      desiredDirection.mult(this.arrived ? 2.4 : 1.7);
    }

    if (!this.isLeaving) {
      desiredDirection.add(this.getSeparationDirection());

      desiredDirection.add(this.getOrganicWander());
    }

    if (this.fleeTimer > 0) {
      this.fleeTimer--;

      desiredDirection = p5.Vector.fromAngle(this.fleeHeading);

      desiredDirection.rotate(random(-0.08, 0.08));
    }

    if (desiredDirection.mag() > 0) {
      this.targetHeading = desiredDirection.heading();
    }

    let activeTurnSpeed = this.turnSpeed;

    if (this.fleeTimer > 0) {
      activeTurnSpeed *= 2.2;
    }

    this.heading = lerpAngle(this.heading, this.targetHeading, activeTurnSpeed);

    let desiredSpeed = this.walkSpeed;

    if (!this.arrived) {
      desiredSpeed *= 2.5;
    }

    if (this.isLeaving) {
      desiredSpeed *= 4;
    }

    if (this.pauseTimer > 0 && !this.isLeaving) {
      desiredSpeed = 0;
    }

    if (this.fleeTimer > 0) {
      desiredSpeed = this.walkSpeed * 2;
    }

    // Slow down when making a sharp turn.

    const turnDifference = abs(
      getAngleDifference(this.heading, this.targetHeading),
    );

    if (turnDifference > 0.7) {
      desiredSpeed *= 0.65;
    }

    this.currentSpeed = lerp(this.currentSpeed, desiredSpeed, 0.13);

    // Forward walking only.
    // No floating or sideways movement.

    this.position.x += cos(this.heading) * this.currentSpeed;

    this.position.y += sin(this.heading) * this.currentSpeed;

    this.walkCycle += this.currentSpeed * 0.36;
  }

  getOrganicWander() {
    const wanderValue = noise(this.noiseOffset, frameCount * 0.006);

    const wanderAngle = map(wanderValue, 0, 1, -0.35, 0.35);

    return p5.Vector.fromAngle(
      this.heading + wanderAngle,
      this.arrived ? 0.018 : 0.035,
    );
  }

  getSeparationDirection() {
    const separationDirection = createVector(0, 0);

    let nearbyCount = 0;

    for (let other of ants) {
      if (other === this) {
        continue;
      }

      const differenceVector = p5.Vector.sub(this.position, other.position);

      const separationAmount = differenceVector.mag();

      if (separationAmount > 0 && separationAmount < 30) {
        differenceVector.normalize();

        differenceVector.mult(map(separationAmount, 0, 30, 2, 0));

        separationDirection.add(differenceVector);

        nearbyCount++;
      }
    }

    if (nearbyCount > 0) {
      separationDirection.limit(2.8);
    }

    return separationDirection;
  }

  updatePause() {
    if (this.isLeaving) {
      return;
    }

    if (this.pauseTimer > 0) {
      this.pauseTimer--;
      return;
    }

    if (this.fleeTimer <= 0 && random() < 0.001) {
      this.pauseTimer = floor(random(5, 25));
    }
  }

  fleeFrom(threatPosition) {
    const fleeDirection = p5.Vector.sub(this.position, threatPosition);

    if (fleeDirection.mag() > 0) {
      this.fleeHeading = fleeDirection.heading();
    } else {
      this.fleeHeading = random(TWO_PI);
    }

    this.fleeTimer = floor(random(35, 65));

    this.pauseTimer = 0;
  }

  // ------------------------------------------------
  // DRAW ANT
  // ------------------------------------------------

  display() {
    push();

    translate(this.position.x, this.position.y);

    rotate(this.heading + HALF_PI);

    translate(0, sin(this.walkCycle * 2) * 0.3);

    scale(this.size);

    stroke(antColour);
    fill(antColour);

    strokeWeight(1.25);
    strokeCap(ROUND);
    strokeJoin(ROUND);

    let stepAmount = 0;

    if (this.currentSpeed > 0.05) {
      stepAmount = sin(this.walkCycle) * 2.5;
    }

    this.drawAnt(stepAmount);

    pop();
  }

  drawAnt(stepAmount) {
    const bodyGradient = drawingContext.createRadialGradient(0, 0, 1, 0, 0, 19);
    bodyGradient.addColorStop(0, fireAntRed);
    bodyGradient.addColorStop(1, antColour);

    drawingContext.fillStyle = bodyGradient;

    drawingContext.beginPath();
    drawingContext.ellipse(0, 8, 3.75, 6.25, 0, 0, TWO_PI);
    drawingContext.ellipse(0, 0, 2.75, 3.5, 0, 0, TWO_PI);
    drawingContext.arc(0, -7, 3.25, 0, TWO_PI);
    drawingContext.fill();

    stroke(antColour);

    for (let side of [-1, 1]) {
      // Front legs
      this.drawLeg(
        side * 2,
        -2,
        side * 7,
        -7 + stepAmount * side,
        side * 12,
        -5 + stepAmount * side,
      );

      // Middle legs
      this.drawLeg(
        side * 2.5,
        1,
        side * 8,
        2 - stepAmount * side,
        side * 13,
        7 - stepAmount * side,
      );

      // Back legs
      this.drawLeg(
        side * 2,
        5,
        side * 7,
        11 + stepAmount * side,
        side * 11,
        15 + stepAmount * side,
      );

      // Antennae
      noFill();

      beginShape();

      vertex(side * 1.5, -9);

      vertex(side * 5, -14);

      vertex(side * 8, -16);

      endShape();
    }
  }

  drawLeg(startX, startY, jointX, jointY, endX, endY) {
    noFill();

    beginShape();

    vertex(startX, startY);

    vertex(jointX, jointY);

    vertex(endX, endY);

    endShape();
  }
}

// --------------------------------------------------
// ANGLE HELPERS
// --------------------------------------------------

function getAngleDifference(firstAngle, secondAngle) {
  let angleDifference = secondAngle - firstAngle;

  while (angleDifference > PI) {
    angleDifference -= TWO_PI;
  }

  while (angleDifference < -PI) {
    angleDifference += TWO_PI;
  }

  return angleDifference;
}

function lerpAngle(currentAngle, targetAngle, amount) {
  return currentAngle + getAngleDifference(currentAngle, targetAngle) * amount;
}

// --------------------------------------------------
// RESIZE
// --------------------------------------------------

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  calculateAntCount();

  for (let ant of ants) {
    ant.target = getSwarmPosition(
      ant.arrived ? ant.pathProgress : ant.slotProgress,

      ant.laneOffset,
      ant.flowLine,
    );
  }
}
