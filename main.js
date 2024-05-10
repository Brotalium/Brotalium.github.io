

var objects = [];
var instances = [];
var intervalId = 0;
var running = false;
var mousePos;

var keyPressed = new Map();

function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}

class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(vec) {
    return new Vec2(this.x + vec.x, this.y + vec.y);
  }

  mult(by) {
    return new Vec2(this.x * by, this.y * by);
  }

  sub(vec) {
    return new Vec2(this.x - vec.x, this.y - vec.y);
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  unit() {
    return new Vec2(this.x / this.mag(), this.y / this.mag());
  }

  lerp(goal, time) {
    return new Vec2(lerp(this.x, goal.x, time), lerp(this.y, goal.y, time));
  }

  dot(vec) {
    return this.x * vec.x + this.y * vec.y;
  }
}

var cameraPosition = new Vec2(0, 0);

function getScreenX(x, par) {
  return x - cameraPosition.x * par + gameArea.canvas.width / 2;
}

function getScreenY(y, par) {
  return y - cameraPosition.y * par + gameArea.canvas.height / 2;
}

class PhysicsBody {
  constructor(position) {
    this.position = position;
    this.velocity = new Vec2(0, 0);
    this.rotation = 0;
    this.angularVelocity = 0;
    this.name = 'None';
    this.parallax = 1;
    this.collidingWith = [];
    this.visible = true;
    this.layer = 0;
    this.collisionSizeFactor = 1;
  }

  upVector() {
    return new Vec2(
      Math.cos(this.rotation + Math.PI / 2),
      Math.sin(this.rotation + Math.PI / 2)
    );
  }

  rightVector() {
    return new Vec2(Math.cos(this.rotation), Math.sin(this.rotation));
  }

  physicsUpdate(dt) {
    this.position = this.position.add(this.velocity.mult(dt));
    this.rotation += this.angularVelocity * dt;
  }
}

class Sprite extends PhysicsBody {
  constructor(position, sprite, size) {
    super(position);
    this.sprite = sprite;
    this.size = size;
    this.outline = false;
    objects.push(this);
  }

  draw() {
    var ctx = gameArea.context;

    ctx.save();
    ctx.translate(
      getScreenX(this.position.x, this.parallax),
      getScreenY(this.position.y, this.parallax)
    );
    ctx.rotate(this.rotation);

    ctx.drawImage(
      document.getElementById(this.sprite),
      this.size.x / -2,
      this.size.y / -2,
      this.size.x,
      this.size.y
    );

    if (this.outline) {
      ctx.strokeStyle = this.outline;
      ctx.strokeRect(
        this.size.x / -2,
        this.size.y / -2,
        this.size.x,
        this.size.y
      );
    }

    ctx.restore();
  }
}

class Box extends PhysicsBody {
  constructor(position, size) {
    super(position);
    this.size = size;
    objects.push(this);

    this.color = '#FF0000';
    this.outline = false;
  }

  draw() {
    var ctx = gameArea.context;

    ctx.save();
    if (this.lockedToScreen) {
      ctx.translate(this.position.x, this.position.y);
    } else {
      ctx.translate(
        getScreenX(this.position.x, this.parallax),
        getScreenY(this.position.y, this.parallax)
      );
    }

    ctx.rotate(this.rotation);

    ctx.fillStyle = this.color;
    ctx.fillRect(this.size.x / -2, this.size.y / -2, this.size.x, this.size.y);

    ctx.restore();

    if (this.outline) {
      ctx.strokeStyle = this.outline;
      ctx.strokeRect(
        this.position.x - this.size.x / 2 - cameraPosition.x,
        this.position.y - this.size.y / 2 - cameraPosition.y,
        this.size.x,
        this.size.y
      );
    }
  }
}

class TextBox extends PhysicsBody {
  constructor(position, txt, style) {
    super(position);
    this.text = txt;
    this.size = new Vec2(1, 1);
    this.color = '#000000';
    this.style = style;

    objects.push(this);
  }

  draw() {
    var ctx = gameArea.context;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.font = this.style;

    ctx.save();
    if (this.lockedToScreen) {
      ctx.translate(this.position.x, this.position.y);
    } else {
      ctx.translate(
        getScreenX(this.position.x, this.parallax),
        getScreenY(this.position.y, this.parallax)
      );
    }
    ctx.rotate(this.rotation);

    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

class Circle extends PhysicsBody {
  constructor(position, radius) {
    super(position);
    this.radius = radius;

    this.color = '#FF0000';
    this.outline = false;

    objects.push(this);
  }

  draw() {
    var ctx = gameArea.context;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(
      this.position.x - cameraPosition.x,
      this.position.y - cameraPosition.y,
      this.radius,
      0,
      2 * Math.PI
    );
    ctx.fill();
    if (this.outline) {
      ctx.strokeStyle = this.outline;
      ctx.stroke();
    }
  }
}

function terminate() {}

var gameArea = {
  canvas: document.getElementById('canvas'),
  start: function () {
    this.context = this.canvas.getContext('2d');
    this.centerPoint = new Vec2(this.canvas.width / 2, this.canvas.height / 2);

    window.addEventListener('click', function (e) {
      if (!running) {
        running = true;
        onStart();
      }
    });

    window.addEventListener('keydown', function (e) {
      if (e.key == 'p') {
        console.log('Terminating...');
        clearInterval(intervalId);
      }

      keyPressed.set(e.key, true);
    });

    window.addEventListener('keyup', function (e) {
      keyPressed.set(e.key, false);
    });

    window.addEventListener('mousemove', function (e) {
      mousePos = new Vec2(e.offsetX, e.offsetY);
    });
  },
  clear: function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
};

function getObjectByName(name) {
  var i;
  for (i = 0; i < objects.length; i++) {
    if (objects[i].name == name) {
      return objects[i];
    }
  }
}

var pt = Date.now();

function onStart() {
  // setup background

  game_start();

  pt = Date.now();
  intervalId = setInterval(update, 20);
}

var globalTime = 0;

function update() {
  gameArea.clear();
  var dt = Date.now() - pt;
  pt = Date.now();
  dt *= 0.001;

  globalTime += dt;

  for (i = 0; i < objects.length; i++) {
    if (objects[i].destroy) {
      delete objects[i];
      objects.splice(i, 1);
    }
  }

  //
  game_update(dt);
  //

  var i;
  for (i = 0; i < instances.length; i++) {
    instances[i].update(dt);
  }

  objects.sort(function (a, b) {
    return a.layer - b.layer;
  });

  var i;
  for (i = 0; i < objects.length; i++) {
    var k;
    for (k = 0; k < objects.length; k++) {
      if (objects[i] != objects[k]) {
        if (testBoxCollision(objects[i], objects[k])) {
          if (!objects[i].collidingWith.includes(objects[k])) {
            objects[i].collidingWith.push(objects[k]);
          }
        } else {
          if (objects[i].collidingWith.includes(objects[k])) {
            let index = objects[i].collidingWith.indexOf(objects[k]);
            objects[i].collidingWith.splice(index, 1);
          }
        }
      }
    }

    objects[i].physicsUpdate(dt);
    if (objects[i].visible) {
      objects[i].draw();
    }
  }
}

// collisions //

function testBoxCollision(a, b) {
  function setupPoints(thing) {
    let tb = [];

    let xsize = thing.size.x * thing.collisionSizeFactor;
    let ysize = thing.size.y * thing.collisionSizeFactor;

    tb[0] = thing.position.add(new Vec2(-xsize / 2, -ysize / 2));
    tb[1] = thing.position.add(new Vec2(xsize / 2, -ysize / 2));
    tb[2] = thing.position.add(new Vec2(-xsize / 2, ysize / 2));
    tb[3] = thing.position.add(new Vec2(xsize / 2, ysize / 2));
    return tb;
  }

  var pointsA = setupPoints(a);
  var pointsB = setupPoints(b);

  var i = 0;
  var hasGreaterXPoint = false;
  var hasGreaterYPoint = false;
  var hasLesserXPoint = false;
  var hasLesserYPoint = false;

  for (i = 0; i < pointsA.length; i++) {
    var k = 0;

    if (
      hasGreaterXPoint &&
      hasLesserXPoint &&
      hasGreaterYPoint &&
      hasLesserYPoint
    ) {
      break;
    }

    for (k = 0; k < pointsB.length; k++) {
      if (pointsA[i].x < pointsB[k].x) {
        hasGreaterXPoint = true;
      }
      if (pointsA[i].x > pointsB[k].x) {
        hasLesserXPoint = true;
      }

      if (pointsA[i].y < pointsB[k].y) {
        hasGreaterYPoint = true;
      }
      if (pointsA[i].y > pointsB[k].y) {
        hasLesserYPoint = true;
      }
    }
  }

  if (
    hasGreaterXPoint &&
    hasLesserXPoint &&
    hasGreaterYPoint &&
    hasLesserYPoint
  ) {
    return true;
  }

  return false;
}
///
/// END OF ENGINE CODE //
///

// globals
var backgroundTiles = [];
var playerHealth = 10;
var nextWaveStart = 0;
var currentWave = 0;
var enemiesKilled = 0;
var totalEnemies = 0;
var isWave = false;
var isDeathScreen = false;
var mapSize = 3000;

var laserCooldown = 0;

function randomUnitVector() {
  let angle = Math.random() * 2 * Math.PI;
  return new Vec2(Math.cos(angle), Math.sin(angle));
}

function playerTakeDamage(dmg) {
  playerHealth -= dmg;
}

function displayCenterText(txt) {
  let textbox = getObjectByName('CenterTextBox');
  textbox.text = txt;
}

class Projectile extends Sprite {
  constructor(position, sprite, size) {
    super(position, sprite, size);
    this.damage = 1;
    this.fromEnemy = false;
    this.cleanTimer = 4;
    this.startTime = globalTime;
  }

  physicsUpdate(dt) {
    super.physicsUpdate(dt);

    if (this.fromEnemy) {
      this.collisionSizeFactor = 0.5;
    }

    if (globalTime - this.startTime > this.cleanTimer) {
      this.destroy = true;
    }

    let i = 0;
    for (i = 0; i < this.collidingWith.length; i++) {
      let collider = this.collidingWith[i];
      if (collider.isEnemy && !this.fromEnemy) {
        collider.takeDamage(this.damage);
        this.destroy = true;
      }

      if (collider.name == 'Ship' && this.fromEnemy) {
        playerTakeDamage(this.damage);
        this.destroy = true;
      }
    }
  }
}

class ExplosionEffect {
  constructor(position, sizeFactor) {
    this.position = position;
    this.size = sizeFactor;

    this.initialTime = globalTime;
    this.finishTime = this.initialTime + 0.5;

    this.blast = new Box(position, new Vec2(sizeFactor, sizeFactor));
    this.blast.color = '#FFAA00';

    instances.push(this);
  }
  update(dt) {
    var p =
      (globalTime - this.initialTime) / (this.finishTime - this.initialTime);
    this.blast.rotation += dt * 90;
    this.blast.size = new Vec2(this.size, this.size).lerp(new Vec2(1, 1), p);

    if (globalTime > this.finishTime) {
      this.blast.destroy = true;
    }
  }
}

class EnemyBase extends Sprite {
  constructor(position, sprite, size) {
    super(position, sprite, size);
    this.isEnemy = true;
    this.health = 1;
    this.maxHealth = this.health;

    this.offScreenMarker = new TextBox(
      new Vec2(gameArea.canvas.width / 2, gameArea.canvas.height / 2),
      '',
      '40px Arial'
    );
    this.offScreenMarker.color = '#FF0000';
    this.offScreenMarker.lockedToScreen = true;

    this.healthBackground = new Box(this.position, new Vec2(this.size.x, 10));
    this.healthBar = new Box(this.position, new Vec2(this.size.x, 10));

    this.healthBackground.color = '#FF0000';
    this.healthBar.color = '#00FF00';

    this.healthBackground.visible = false;
    this.healthBar.visible = false;
  }

  takeDamage(amt) {
    this.health -= amt;

    if (this.health <= 0) {
      new ExplosionEffect(this.position, 50);
      this.offScreenMarker.destroy = true;
      this.destroy = true;
      this.healthBar.destroy = true;
      this.healthBackground.destroy = true;
      totalEnemies -= 1;
    }
  }

  physicsUpdate(dt) {
    super.physicsUpdate(dt);

    if (this.healthBackground && this.healthBar) {
      let healthP = this.health / this.maxHealth;

      if (this.health > 0) {
        let p = this.health / this.maxHealth;
        this.healthBar.size = new Vec2(
          this.healthBackground.size.x * healthP,
          10
        );

        this.healthBar.visible = true;
        this.healthBackground.visible = true;
      } else {
        this.healthBar.visible = false;
        this.healthBackground.visible = false;
      }

      this.healthBackground.position = this.position.add(
        new Vec2(0, -this.size.y - 20)
      );
      this.healthBar.position = new Vec2(
        this.healthBackground.position.x +
          (this.healthBackground.size.x * (1 - healthP)) / 2,
        this.healthBackground.position.y
      );
    }

    if (this.offScreenMarker) {
      if (
        this.position.x - cameraPosition.x < -gameArea.canvas.width / 2 ||
        this.position.x - cameraPosition.x > gameArea.canvas.width / 2 ||
        this.position.y - cameraPosition.y < -gameArea.canvas.height / 2 ||
        this.position.y - cameraPosition.y > gameArea.canvas.height / 2
      ) {
        this.offScreenMarker.text = '!';
        let direction = this.position.sub(cameraPosition).unit();

        this.offScreenMarker.position = gameArea.centerPoint.add(
          direction.mult(200)
        );
      } else {
        this.offScreenMarker.text = '';
      }
    }
  }
}

class BasicFighterEnemy extends EnemyBase {
  constructor(position) {
    super(position, 'BasicEnemyShip', new Vec2(50, 50));

    this.throttle = 0;
    this.targetHeading = new Vec2(1, 0);
    this.maxSpeed = 75;
    this.shootCooldown = 0;

    this.randomDodgeStart = 100;
    this.randomDodgeEnd = 0;
  }

  physicsUpdate(dt) {
    super.physicsUpdate(dt);
    let player = getObjectByName('Ship');
    //control

    var accel = this.upVector().mult(-this.throttle * dt);
    accel = accel.add(this.velocity.mult(-0.04));
    this.velocity = this.velocity.add(accel);

    let currentHeading = this.upVector().mult(-1);
    let newHeading = currentHeading.lerp(this.targetHeading, dt * 20);
    this.rotation = Math.atan2(newHeading.y, newHeading.x) + Math.PI / 2;

    //ai

    if (this.position.sub(player.position).mag() < 300) {
      if (globalTime > this.shootCooldown) {
        this.shootCooldown = globalTime + 0.5;
        fireLaser(this, 600, true, 'Laser');
      }
    }

    if (this.position.sub(player.position).mag() > 100) {
      let offset = this.position.sub(player.position);
      this.throttle = 1500;
      this.targetHeading = offset.unit().mult(-1);
      // this.targetRotation = Math.atan2(offset.y, offset.x) - Math.PI / 2;
    } else {
    }

    if (
      globalTime > this.randomDodgeStart &&
      globalTime < this.randomDodgeEnd
    ) {
      this.targetHeading = this.randomHeadingVector;
    }

    if (globalTime > this.randomDodgeEnd) {
      this.randomDodgeStart = globalTime + 3 + Math.random() * 2;
      this.randomDodgeEnd = this.randomDodgeStart + Math.random() * 2;

      this.randomHeadingAngle = Math.random() * 2 * Math.PI;
      this.randomHeadingVector = new Vec2(
        Math.cos(this.randomHeadingAngle),
        Math.sin(this.randomHeadingAngle)
      );
    }
  }
}

class ArmoredFighterEnemy extends BasicFighterEnemy {
  constructor(position) {
    super(position);
    this.sprite = 'ArmoredFighter';
    this.maxHealth = 3;
    this.health = 3;
  }
}

class RadialTurret extends EnemyBase {
  constructor(position) {
    super(position, 'RadialShooter', new Vec2(60, 60));
    this.maxHealth = 2;
    this.health = 2;
    this.ofs = randomUnitVector().mult(Math.random() * 100 + 50);
    this.fireInterval = 0;
  }

  physicsUpdate(dt) {
    super.physicsUpdate(dt);
    let player = getObjectByName('Ship');
    let goalOffset = player.position.add(this.ofs);
    let goalHeading = goalOffset.sub(this.position);

    this.velocity = goalHeading.unit().mult(goalHeading.mag());

    if (globalTime > this.fireInterval) {
      this.fireInterval = globalTime + 1.5;

      let i = 0;

      for (i = 0; i <= 7; i++) {
        let angle = (Math.PI / 4) * i;
        let dir = new Vec2(Math.cos(angle), Math.sin(angle));
        fireLaserDirection(this, 400, true, 'Laser', dir);
      }
    }
  }
}

class SpinningRadialTurret extends EnemyBase {
  constructor(position) {
    super(position, 'SpinningRadialShooter', new Vec2(60, 60));
    this.maxHealth = 2;
    this.health = 2;
    this.ofs = randomUnitVector().mult(Math.random() * 100 + 50);
    this.fireInterval = 0;
    this.fireAngle = 0;
    this.rotation = Math.random() * 10;
  }

  physicsUpdate(dt) {
    super.physicsUpdate(dt);
    let player = getObjectByName('Ship');
    let goalOffset = player.position.add(this.ofs);
    let goalHeading = goalOffset.sub(this.position);

    this.velocity = goalHeading.unit().mult(goalHeading.mag());
    this.angularVelocity = -0.25;

    if (globalTime > this.fireInterval) {
      this.fireInterval = globalTime + 0.15;

      this.fireAngle += Math.PI / 4;
      let dir = new Vec2(
        Math.cos(this.fireAngle + this.rotation),
        Math.sin(this.fireAngle + this.rotation)
      );
      fireLaserDirection(this, 400, true, 'Laser', dir);
    }
  }
}

class Sawblade extends EnemyBase {
  constructor(position) {
    super(position, 'Sawblade', new Vec2(80, 80));
  }
}

function game_update(dt) {
  wavesUpdate();
  // ship controls
  var ship = getObjectByName('Ship');
  var shipVelocity = new Vec2(0, 0);
  var shipAV = 0;
  if (keyPressed.get('w')) {
    shipVelocity = shipVelocity.add(new Vec2(0, -1));
  }
  if (keyPressed.get('s')) {
    shipVelocity = shipVelocity.add(new Vec2(0, 1));
  }
  if (keyPressed.get('a')) {
    shipVelocity = shipVelocity.add(new Vec2(-1, 0));
  }
  if (keyPressed.get('d')) {
    shipVelocity = shipVelocity.add(new Vec2(+1, 0));
  }

  if (keyPressed.get('ArrowLeft')) {
    shipAV -= 1;
  }

  if (keyPressed.get('ArrowRight')) {
    shipAV += 1;
  }

  var accel = new Vec2(0, shipVelocity.y * 2000 * dt);
  accel = accel.add(new Vec2(shipVelocity.x * 2000 * dt, 0));
  accel = accel.add(ship.velocity.mult(-0.06));
  var shipMaxSpeed = 100;
  ship.velocity = ship.velocity.add(accel);

  if (ship.position.x > mapSize / 2 || ship.position.x < -mapSize / 2) {
    ship.position.add(ship.velocity.mult(-1));
    ship.velocity.x = 0;
  }

  if (ship.position.y > mapSize / 2 || ship.position.y < -mapSize / 2) {
    ship.position.add(ship.velocity.mult(-1));
    ship.velocity.y = 0;
  }

  ship.position.x = Math.max(
    Math.min(ship.position.x, mapSize / 2),
    -mapSize / 2
  );

  ship.position.y = Math.max(
    Math.min(ship.position.y, mapSize / 2),
    -mapSize / 2
  );

  if (isDeathScreen) {
    ship.velocity = new Vec2(0, 0);
  }

  //ship.angularVelocity = shipAV * 5;
  let mouseDirection = mousePos.sub(
    new Vec2(gameArea.canvas.width / 2, gameArea.canvas.height / 2)
  );

  let currentHeading = ship.upVector().mult(-1);
  let newHeading = currentHeading.lerp(mouseDirection, dt * 20);
  ship.rotation = Math.atan2(newHeading.y, newHeading.x) + Math.PI / 2;

  let aimArrow = getObjectByName('AimArrow');
  aimArrow.position = ship.position.add(ship.upVector().mult(-100));
  aimArrow.rotation = ship.rotation;

  // camera lerp

  cameraPosition = cameraPosition.lerp(ship.position, 0.5);

  // update background tiles

  var parSize = 600;

  var shipCellX = Math.round(cameraPosition.mult(1 / parSize).x * 0.5);
  var shipCellY = Math.round(cameraPosition.mult(1 / parSize).y * 0.5);

  backgroundTiles[0].position = new Vec2(shipCellX - 1, shipCellY - 1).mult(
    parSize
  );
  backgroundTiles[1].position = new Vec2(shipCellX + 1, shipCellY - 1).mult(
    parSize
  );
  backgroundTiles[2].position = new Vec2(shipCellX - 1, shipCellY + 1).mult(
    parSize
  );
  backgroundTiles[3].position = new Vec2(shipCellX + 1, shipCellY + 1).mult(
    parSize
  );
  backgroundTiles[4].position = new Vec2(shipCellX, shipCellY - 1).mult(
    parSize
  );
  backgroundTiles[5].position = new Vec2(shipCellX, shipCellY + 1).mult(
    parSize
  );
  backgroundTiles[6].position = new Vec2(shipCellX - 1, shipCellY).mult(
    parSize
  );
  backgroundTiles[7].position = new Vec2(shipCellX + 1, shipCellY).mult(
    parSize
  );
  backgroundTiles[8].position = new Vec2(shipCellX, shipCellY).mult(parSize);

  // healthbar ui //
  let healthBar = getObjectByName('HealthBar');

  let p = playerHealth / 10;
  healthBar.size = new Vec2(lerp(0, 300, p), 50);
  healthBar.position = new Vec2(
    lerp(0, 150, p) + 10,
    gameArea.canvas.height - 25 - 10
  );

  // dying //
  if (!isDeathScreen && playerHealth <= 0) {
    isDeathScreen = true;
    displayCenterText('SHIP DESTROYED');

    ship.size = new Vec2(1, 1);

    let waveText = new TextBox(
      new Vec2(gameArea.canvas.width / 2, gameArea.canvas.height / 2 + 100),
      'WAVES COMPLETED: ' + (currentWave - 1).toString(),
      '40px Arial'
    );
    waveText.lockedToScreen = true;

    waveText.color = '#FF00FF';
  }
}

function fireLaser(from, speed, isEnemy, sprite) {
  var laserSpeed = speed;
  // var ship = getObjectByName('Ship');
  var laser = new Projectile(from.position, sprite, new Vec2(10, 50));
  laser.rotation = from.rotation;
  laser.fromEnemy = isEnemy;

  var headingDot = -from.velocity.dot(from.upVector());

  laser.velocity = from.upVector().mult(-laserSpeed);
  //.add(from.velocity.unit().mult(headingDot));

  //if (laser.velocity.mag() < laserSpeed) {
  //laser.velocity = laser.velocity.unit().mult(laserSpeed);
  // }
}

function fireLaserDirection(from, speed, isEnemy, sprite, direction) {
  var laserSpeed = speed;
  // var ship = getObjectByName('Ship');
  var laser = new Projectile(from.position, sprite, new Vec2(10, 50));
  laser.rotation = Math.atan(direction.y / direction.x) + Math.PI / 2;
  laser.fromEnemy = isEnemy;

  laser.velocity = direction.mult(-laserSpeed);
  //.add(from.velocity.unit().mult(headingDot));

  //if (laser.velocity.mag() < laserSpeed) {
  //laser.velocity = laser.velocity.unit().mult(laserSpeed);
  // }
}

addEventListener('keydown', function (e) {
  if (e.key == ' ') {
    if (globalTime > laserCooldown && !isDeathScreen) {
      laserCooldown = globalTime + 0.5;
      fireLaser(getObjectByName('Ship'), 800, false, 'LaserYellow');
    }
  }
});

gameArea.start();
var waves = [];

function wavesUpdate() {
  let player = getObjectByName('Ship');
  if (nextWaveStart != 0 && globalTime > nextWaveStart) {
    displayCenterText('WAVE ' + (currentWave + 1).toString());
  }
  if (nextWaveStart != 0 && globalTime > nextWaveStart + 3) {
    nextWaveStart = 0;
    currentWave += 1;
    displayCenterText('');

    totalEnemies = 0;
    enemiesKilled = 0;

    var waveData = waves[currentWave - 1];

    var i = 0;
    for (i = 0; i < waveData.length; i++) {
      let enemyData = waveData[i];
      let enemyType = enemyData[0];
      let amountOfEnemies = enemyData[1];

      let k = 0;
      for (k = 0; k < amountOfEnemies; k++) {
        let angle = Math.random() * 2 * Math.PI;

        totalEnemies += 1;

        let spawnedEnemy = new enemyType(
          new Vec2(Math.cos(angle), Math.sin(angle))
            .mult(500)
            .add(player.position)
        );
      }
    }

    isWave = true;
  }

  if (totalEnemies <= 0 && isWave) {
    isWave = false;
    displayCenterText('WAVE COMPLETE');
    nextWaveStart = globalTime + 3;
  }
}

function game_start() {
  var i;
  for (i = 0; i < 9; i++) {
    var tile = new Sprite(new Vec2(0, 0), 'SpaceBG', new Vec2(600, 600));
    tile.parallax = 0.5;
    backgroundTiles.push(tile);
  }

  waves = [
    [[BasicFighterEnemy, 3]],
    [[BasicFighterEnemy, 5]],
    [
      [BasicFighterEnemy, 1],
      [ArmoredFighterEnemy, 2],
    ],
    [[RadialTurret, 2]],
    [
      [RadialTurret, 2],
      [ArmoredFighterEnemy, 1],
      [BasicFighterEnemy, 2],
    ],
    [
      [SpinningRadialTurret, 2],
      [BasicFighterEnemy, 3],
    ],
    [
      [SpinningRadialTurret, 1],
      [ArmoredFighterEnemy, 4],
    ],
    [
      [ArmoredFighterEnemy, 3],
      [BasicFighterEnemy, 3],
      [RadialTurret, 1],
      [SpinningRadialTurret, 1],
    ],
    [[ArmoredFighterEnemy, 8]],
  ];
  nextWaveStart = globalTime + 3;

  var testSprite = new Sprite(new Vec2(100, 100), 'Ship', new Vec2(50, 50));
  testSprite.name = 'Ship';
  testSprite.layer = 10;

  let aimArrow = new Sprite(new Vec2(0, 0), 'AimArrow', new Vec2(25, 100));
  aimArrow.name = 'AimArrow';
  aimArrow.layer = 1;

  var tex = new TextBox(
    new Vec2(gameArea.canvas.width / 2, gameArea.canvas.height / 2),
    '',
    '60px Arial'
  );
  tex.color = '#FF00FF';
  tex.lockedToScreen = true;
  tex.name = 'CenterTextBox';

  // setup health ui //

  var healthBG = new Box(
    new Vec2(160, gameArea.canvas.height - 25 - 10),
    new Vec2(300, 50)
  );
  healthBG.color = '#FF0000';
  healthBG.lockedToScreen = true;

  var healthBar = new Box(
    new Vec2(160, gameArea.canvas.height - 25 - 10),
    new Vec2(300, 50)
  );
  healthBar.color = '#00FF00';
  healthBar.lockedToScreen = true;
  healthBar.name = 'HealthBar';

  healthBG.layer = 100;
  healthBar.layer = 100;

  // map edges //
  let wallWidth = 20;

  let mapEdgeLeft = new Box(
    new Vec2(-mapSize / 2, 0),
    new Vec2(wallWidth, mapSize)
  );
  let mapEdgeRight = new Box(
    new Vec2(mapSize / 2, 0),
    new Vec2(wallWidth, mapSize)
  );
  let mapEdgeTop = new Box(
    new Vec2(0, mapSize / 2),
    new Vec2(mapSize, wallWidth)
  );
  let mapEdgeBottom = new Box(
    new Vec2(0, -mapSize / 2),
    new Vec2(mapSize, wallWidth)
  );

  mapEdgeRight.color = '#FF0000';
  mapEdgeLeft.color = '#FF0000';
  mapEdgeTop.color = '#FF0000';
  mapEdgeBottom.color = '#FF0000';

  // asteroids //

  i = 0;
  for (i = 0; i < 50; i++) {
    let pX = Math.random() * mapSize - mapSize / 2;
    let pY = Math.random() * mapSize - mapSize / 2;

    let size = Math.random() * 200 + 100;

    let a = new Sprite(new Vec2(pX, pY), 'Asteroid', new Vec2(size, size));
    a.rotation = Math.random() * 2 * Math.PI;
  }
}