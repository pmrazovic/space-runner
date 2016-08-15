const ROCKET_SIZE = 15;
const POWER = 0.03;
const PARTICLE_DECAY = 0.1;
const PARTICLE_SIZE = 8;

window.onload = function () {
	// Set the name of the hidden property and the change event for visibility
	var hidden, visibilityChange; 
	if (typeof document.hidden !== "undefined") {
	  hidden = "hidden";
	  visibilityChange = "visibilitychange";
	} else if (typeof document.mozHidden !== "undefined") {
	  hidden = "mozHidden";
	  visibilityChange = "mozvisibilitychange";
	} else if (typeof document.msHidden !== "undefined") {
	  hidden = "msHidden";
	  visibilityChange = "msvisibilitychange";
	} else if (typeof document.webkitHidden !== "undefined") {
	  hidden = "webkitHidden";
	  visibilityChange = "webkitvisibilitychange";
	}

	// Back key event listener
	document.addEventListener('tizenhwkey', function(e) {
	  if (e.keyName === "back") {
	      try {
	          tizen.application.getCurrentApplication().exit();
	      } catch (ignore) {}
	  }
	});

	// Visibility change event listener
	document.addEventListener(visibilityChange, function () {
	  if (document[hidden]){
	  	pause = true;
	    document.removeEventListener('click', action);
	    document.removeEventListener('rotarydetent', move);
        document.removeEventListener('touchstart', move);
        document.removeEventListener('touchend', move);
	  } else {
	    pause = false;
	    countP = 0;
	    if (starting || gameOver) {
	    	document.addEventListener('click', action);
	    } else if (playing) {
	    	document.addEventListener('rotarydetent', move);
	    	document.addEventListener('touchstart', move);
	    	document.addEventListener('touchend', move);
	    }
	  }
	}, false);
	// tap event
	document.addEventListener('click', action);
    
    // Setting up the canvas
    var canvas = document.getElementById('canvas'),
        ctx    = canvas.getContext('2d'),
        cH     = ctx.canvas.height = 360,
        cW     = ctx.canvas.width  = 360;

    //General sprite load
    var imgHeart = new Image();
    imgHeart.src = 'images/heart.png';
    var imgRefresh = new Image();
    imgRefresh.src = 'images/refresh.png';
    var spriteExplosion = new Image();
    spriteExplosion.src = 'images/explosion.png';
    var imgDeadlyIcon = new Image();
    imgDeadlyIcon.src = 'images/deadly_icon.png';
    var imgCoin = new Image();
    imgCoin.src = 'images/coin.png';

    //Game
    var points     = 0, 
        lives      = 4,
        count      = 0,
        pause      = false,
        countP     = 0,
        playing    = false,
        gameOver   = false,
    	starting = true,
        maxEnemies = 0,
        frame = 0;

    var record = localStorage.getItem("record");
    record = record === null ? 0 : record;
    
    //Player
    var player = new _player(cW/2,cH/2,ROCKET_SIZE);
    // particles
    var particles = [];
    // Coin
    var coin = new _coin();
    coin.randomPlace();
    // Enemies
    var enemies = [];
    
    function move(e) {
        if (e.type === 'rotarydetent') {
        	if (e.detail.direction === "CW") { 
               player.rotateClockwise();
            } else {
                player.rotateCounterClockwise();
            }
        } else if (e.type === 'touchstart') {
            player.isAccelerating = true;
        } else if (e.type === 'touchend') {
            player.isAccelerating = false;
        }

    }
 
    function action(e) {
        e.preventDefault();
        if(gameOver) {
            if(e.type === 'click') {
                gameOver   = false;
                player = new _player(cW/2,cH/2,ROCKET_SIZE);
                enemies = [];
                particles = [];
                maxEnemies = 0;                
                starting = true;
                playing = false;
                count      = 0;
                points     = 0;
                lives = 4;
                document.removeEventListener('rotarydetent', move);
                document.removeEventListener('touchstart', move);
                document.removeEventListener('touchend', move);
            } 
        } else if (starting) {
        	if(e.type === 'click') {
        		starting = false;
                playing = true;
                coin = new _coin();
                coin.randomPlace();
                document.addEventListener('rotarydetent', move);
                document.addEventListener('touchstart', move);
                document.addEventListener('touchend', move);
        	}
        } else if (playing) {
            if(e.type === 'click') {
                playing = true;
                document.addEventListener('rotarydetent', move);
                document.addEventListener('touchstart', move);
                document.addEventListener('touchend', move);
            }
        }
        
    }

    function _player(x,y,size) {
        this.power = POWER;
        this.brake = -POWER;
        this.velocity = {
            x: 0,
            y: 0,
        };
        this.position = {
            x:x,
            y:y
        };
        this.isAccelerating = false;
        this.size = size;
        this.width = size;
        this.height = size;
        this.rotation = 0;

        this.canvasSize = this.size * 2;
        this.center = this.canvasSize / 2;

        this.rotateCounterClockwise = function() {
            if (this.rotation <= 0) {
                this.rotation = 360;
            } else {
                this.rotation -= 15;
            }
        };

        this.rotateClockwise = function() {
            if (this.rotation >= 360) {
                this.rotation = 0;
            } else {
                this.rotation += 15;
            }
        };

        this.accelerate = function() {
            const degOffset = Math.PI / 2;
            this.velocity = movePointAtAngle(this.velocity, this.rotation / 180 * Math.PI + degOffset, this.power);
        };

        this.decelerate = function() {
            const degOffset = Math.PI / 2;
            this.velocity = movePointAtAngle(this.velocity, this.rotation / 180 * Math.PI + degOffset, this.brake);
        };

        this.updatePosition = function() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
        };

        this.drawShip = function() {
            const offset = this.center / 2;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = this.size / 6;
            ctx.beginPath();
            ctx.moveTo(this.size / 2 - offset, -offset * 1.7);
            ctx.lineTo(this.size - offset, this.size - offset);
            ctx.lineTo(0 - offset, this.size - offset);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        this.draw = function() {
            // ctx transforms
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(this.rotation / 180 * Math.PI);

            this.drawShip();

            // reset translate/rotation
            ctx.restore();
        };
    }

    function _particle(x,y,vx,vy,size) {        
        this.velocity = {
            x: vx,
            y: vy,
        };
        this.position = {
            x:x,
            y:y,
        };
        this.size = size;
        this.width = size;
        this.height = size;
        this.decay = PARTICLE_DECAY;
        this.dead = false;

        this.updateSize = function() {
            this.size -= this.decay;
            if (this.size <= 0) {
                this.dead = true;
            }
        };

        this.updatePosition = function() {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
        };
        
        this.draw = function() {
            ctx.fillStyle = '#8054dd';
            ctx.fillRect(this.position.x - this.size / 2, this.position.y - this.size / 2, this.size, this.size);
        };
    }

    function _enemy() {
        this.type = random(1,4);
        this.radius = random(5,20);
        this.speed = (Math.random() * (3.0 - 0.5) + 0.5);
        this.dead = false;
        this.state = 0;
        this.stateX = 0;

        switch(this.type){
            case 1:
                // from top to bottom
                this.x = random(this.radius, cW - this.radius);
                this.y = -this.radius*2;
                break;
            case 2:
                // from bottom to top
                this.x = random(this.radius, cW - this.radius);
                this.y = cH + this.radius*2;
                break;
            case 3:
                // from left to right
                this.x = -this.radius*2;
                this.y = random(this.radius, cH - this.radius);
                break;
            case 4:
                // from right to left
                this.x = cW + this.radius*2;
                this.y = random(this.radius, cH - this.radius);
                break;
        }

        this.move = function() {
            switch(this.type){
                case 1:
                    // from top to bottom
                    this.y += this.speed;
                    break;
                case 2:
                    // from bottom to top
                    this.y -= this.speed;
                    break;
                case 3:
                    // from left to right
                    this.x += this.speed;
                    break;
                case 4:
                    // from right to left
                    this.x -= this.speed;
                    break;
            }
        };

        this.draw = function() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x - this.radius, this.y - this.radius, this.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = "#c0392b";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ff7567";
            ctx.stroke();
            ctx.restore();
        };

    }

    function _coin() {
        this.radius = 10;
        this.x = cW/2;
        this.y = cH/2; 
        this.alpha = 1;
        this.alphaDecrease = true;
        this.collected = false;
        this.collectedForFrames = 0; 
        this.collectedPoints = 0;
        this.createdAt = new Date().getTime();
        this.liveForSeconds = 0;
        this.isAtInvalidPosition = function() {
            // if the distance between the coin and any ball is less than 2.5 times the radius, it's NOT legal
            if(euclidianDistance(player.x,player.y,this.x,this.y)<(player.radius*2.5)){
                return true;
            }
            
            // otherwise it's legal
            return false;          
        };
        this.randomPlace = function() {
            do {
            var angle = Math.random() * Math.PI * 2;
            var radius = Math.sqrt(Math.random()) * (cW/2-this.radius*2);
            this.x = cW/2 + radius * Math.cos(angle);
            this.y = cH/2 + radius * Math.sin(angle);
            } while (this.isAtInvalidPosition());
        };    
    }
    
    function explosion(enemy) {
        ctx.save();

        var spriteY,
            spriteX = 256;
        if(enemy.state === 0) {
            spriteY = 0;
            spriteX = 0;
        } else if (enemy.state < 8) {
            spriteY = 0;
        } else if(enemy.state < 16) {
            spriteY = 256;
        } else if(enemy.state < 24) {
            spriteY = 512;
        } else {
            spriteY = 768;
        }

        if(enemy.state === 8 || enemy.state === 16 || enemy.state === 24) {
            enemy.stateX = 0;
        }

        ctx.drawImage(
            spriteExplosion,
            enemy.stateX += spriteX,
            spriteY,
            256,
            256,
            enemy.x-60,
            enemy.y-60,
            120,
            120
        );
        enemy.state += 1;

        ctx.restore();
    }

    function addParticles() {
        var x = player.position.x - 7;
        var y = player.position.y - 7;
        x = x + player.size / 2;
        y = y + player.size / 2;
        var vx = player.velocity.x;
        var vy = player.velocity.y;
        vx = vx;
        vy = vy;

        const particle = new _particle(x, y, vx, vy, PARTICLE_SIZE);
        particles.push(particle);
    }
    
    function update() {
    	frame += 1;
    	frame %= 100;

        if (playing) {
            if (player.isAccelerating) {
                player.accelerate();
                // Add particles
                addParticles();
            } else {
                player.velocity.x *= 0.99;
                player.velocity.y *= 0.99;
            }

            // Checking border
            if (player.position.x < -10) {
                player.position.x = 370;
            }
            if (player.position.x > 370) {
                player.position.x = -10;    
            }
            if (player.position.y < -10 ) {
                player.position.y = 370;
            }
            if (player.position.y > 370) {
                player.position.y = -10;
            }

            // Boucing
            if (euclidianDistance(cW/2,cH/2,player.position.x,player.position.y) >= cW/2 - 7) {
                var normal = { x: player.position.x - cW/2,
                               y: player.position.y - cH/2 };
                var len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                normal.x /= len;
                normal.y /= len;
                var nsx = player.velocity.x - (2 *( normal.x * player.velocity.x + normal.y * player.velocity.y ) ) * normal.x; 
                var nsy = player.velocity.y - (2 *( normal.x * player.velocity.x + normal.y * player.velocity.y ) ) * normal.y;
                player.velocity.x = nsx;
                player.velocity.y = nsy;  
            }

            // Updating rocket position
            player.updatePosition();

            // Collision with the coin
            if (euclidianDistance(player.position.x, player.position.y, coin.x, coin.y) <= coin.radius + 7 && !coin.collected) {
                coin.collected = true;
                coin.collectedPoints = coin.liveForSeconds;
                points += coin.collectedPoints;
                maxEnemies = Math.floor(points/10);
            }

            if (coin.collected) {
                if (coin.collectedForFrames > 30) {
                    coin.collected = false;
                    coin.collectedForFrames = 0;
                    coin.randomPlace();
                    coin.createdAt = new Date().getTime();
                    coin.liveForSeconds = 0;
                } else {
                    coin.collectedForFrames += 1;
                }
            }

            // Checking coin's live span
            var currentTime = new Date().getTime();
            var liveForSeconds = Math.round((currentTime - coin.createdAt)/1000);
            coin.liveForSeconds = 10 - liveForSeconds;
            if (coin.liveForSeconds === 0 && !coin.collected) {
                coin.collected = true;
                coin.collectedPoints = -2;
                points += coin.collectedPoints;
                if (points < 0) {
                    points = 0;
                }         
            }

            // Creating enemies
            if(enemies.length < maxEnemies) {
                var newEnemy = new _enemy();
                enemies.push(newEnemy);
            }

            // Moving enemies
            for (var i = 0; i < enemies.length; i++) {
                enemies[i].move();
            }

            // Checking enemy position
            var enemiesOut = [];
            for (i = 0; i < enemies.length; i++) {
            	var enemy = enemies[i];
                if (!(enemy.x >= -enemy.radius*2 && enemy.x <= cW + enemy.radius*2 &&
                	enemy.y >= -enemy.radius*2 && enemy.y <= cH + enemy.radius*2)) {
                	enemiesOut.push(i);
                }
            }
            
            for (i = 0; i < enemiesOut.length; i++) {
            	enemies.splice(enemiesOut[i], 1);
            }

            // Collision between enemy and player
            for (i = 0; i < enemies.length; i++) {
                if (euclidianDistance(player.position.x, player.position.y, enemies[i].x, enemies[i].y) <= enemies[i].radius + 10 && !enemies[i].dead) {
                    enemies[i].dead = true;
                }
            }

            // Remove exploded
            for (i = 0; i < enemies.length; i++) {
                if (enemies[i].dead) {
                    if (enemies[i].state === 31) {
                        lives -= 1;
                        if (lives === -1) {
                            gameOver = true;
                            playing  = false;
                            document.addEventListener('click', action);
                            document.removeEventListener('rotarydetent',move);
                            document.removeEventListener('touchstart', move);
                            document.removeEventListener('touchend', move);
                        } else {
                            enemies.splice(i, 1);
                        }                   
                    }
                }
            }


        }
    }
    
    function draw() {
        if (pause) {
            if (countP < 1) {
                countP = 1;
            }
        } else if (playing) {
        	//Clear
            ctx.clearRect(0, 0, cW, cH);

            // Particles
            var deadParticles = [];
            for (var i = 0; i < particles.length; i++) {
            	var particle = particles[i];
                particle.updatePosition();
                particle.updateSize();
                particle.draw();
                if (particle.dead) {
                	deadParticles.push(i);
                }
            }
            for (i = 0; i < deadParticles.length; i++) {
            	particles.splice(deadParticles[i], 1);
            }

            // Player
            player.draw();     

            // Enemies
            for (i = 0; i < enemies.length; i++) {
                if (enemies[i].dead) {
                    explosion(enemies[i]);
                } else {
                    enemies[i].draw();
                }
            }
            

            // Drawing coin ---------------
            if (coin.collected) {
                var alpha = 1;
                var up = 0;
                if (coin.collectedForFrames > 0) {
                    alpha = 1 - coin.collectedForFrames/30;
                    up = coin.collectedForFrames/5; 
                }
                ctx.font = "bold 18px Helvetica";
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                var sign = "";
                if (coin.collectedPoints > 0) {
                    sign = '+';
                    ctx.fillStyle = "rgba(57,192,43," + alpha + ")";
                } else {
                    ctx.fillStyle = "rgba(197,57,43," + alpha + ")";
                }
                ctx.fillText(sign + coin.collectedPoints, coin.x, coin.y - up);  
            } else {
                if (coin.alphaDecrease) {
                    coin.alpha -= 0.05;
                } else {
                    coin.alpha += 0.05;
                }
                if (coin.alpha >= 1) {
                    coin.alphaDecrease = true;
                } else if (coin.alpha <= 0.2) {
                    coin.alphaDecrease = false;
                }
                ctx.globalAlpha = coin.alpha;
                ctx.shadowBlur=20;
                ctx.shadowColor="black";
                ctx.drawImage(
                    imgCoin,
                    coin.x - coin.radius,
                    coin.y - coin.radius,
                    20,
                    20
                );
                ctx.shadowBlur=0;
                ctx.globalAlpha = 1;

                ctx.font = "bold 14px Helvetica";
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.textBaseline = 'middle';
                ctx.fillText(coin.liveForSeconds, coin.x, coin.y - 20);                  
            }
            
            // Drawing HUD ----------------
            // Draw lives
            var startX = 130;
            for (var k = 0; k < lives; k++) {
                ctx.drawImage(
                    imgHeart,
                    startX,
                    35,
                    20,
                    20
                );
                startX += 25;
            }

            // Record
            ctx.font = "14px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText(TIZEN_L10N["record"] + ": " + record, cW/2,25);  
            
            // Points
            ctx.font = "bold 14px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle';
            ctx.fillText(TIZEN_L10N["score"] + ": " + points, cW/2, cH - 25);  
            
        } else if(starting) {
            //Clear
            ctx.clearRect(0, 0, cW, cH);
            ctx.beginPath();

            ctx.font = "bold 25px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["title"], cW/2,cH/2 - 110);

            ctx.font = "bold 18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["tap_to_play"], cW/2,cH/2 - 80);     
              
            ctx.font = "bold 18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["instructions"], cW/2,cH/2 + 80);
              
            ctx.font = "13px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            wrapText(TIZEN_L10N["collect"], cW/2,cH/2 + 105, 220, 14);
            
            ctx.drawImage(
                    imgDeadlyIcon,
                    cW/2 - 125,
                    cH/2 - 43
                );
        } else if(count < 1) {
            count = 1;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.rect(0,0, cW,cH);
            ctx.fill();

            ctx.font = "bold 25px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText("Game over",cW/2,cH/2 - 100);

            ctx.font = "18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["score"] + ": "+ points, cW/2,cH/2 + 100);

            record = points > record ? points : record;
            localStorage.setItem("record", record);

            ctx.font = "18px Helvetica";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText(TIZEN_L10N["record"] + ": "+ record, cW/2,cH/2 + 125);

            ctx.drawImage(imgRefresh, cW/2 - 23, cH/2 - 23);        	
        }
    }
    
    function init() {
    	update();
        ctx.save();
        draw();
        ctx.restore();
        window.requestAnimationFrame(init);
    }

    init();

    //Utils ---------------------
    function random(from, to) {
        return Math.floor(Math.random() * (to - from + 1)) + from;
    }

    function euclidianDistance(x1,y1,x2,y2) {
        return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
    }

    function movePointAtAngle(point, angle, distance) {
        return {
            x: point.x - (Math.cos(angle) * distance),
            y: point.y - (Math.sin(angle) * distance),
        };
    }
    
    function wrapText(text, x, y, maxWidth, lineHeight) {
        var words = text.split(' ');
        var line = '';

        for(var n = 0; n < words.length; n++) {
          var testLine = line + words[n] + ' ';
          var metrics = ctx.measureText(testLine);
          var testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
          }
          else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, y);
      }

};