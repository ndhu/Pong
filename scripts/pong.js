(function(window, document, undefined){

	window.AH = {};

	AH.CONSTS = {
		KEYS: {
			Q: 81,
			A: 65,
			P: 80,
			L: 76
		},
		SOUNDS: {
			HIT: 0,
			WIN: 1,
			LOOSE: 2,
			BEGIN: 3
		},
		MATH: {
			TWO_PI: 2 * Math.PI
		}
	},

	AH.Defaults = {
		paddleWidth: 10,
		paddleHeight: 30,
		paddleSpeed: 3,
		ballRadius: 5,
		ballSpeed: 2,
		backgroundColor: "#333",
		objectColor: "#f5f5f5",
		strokeColor: "#999",
		lineWidth: 1,
		font: "bold 20pt Courier",
		fieldWidth: 600,
		fieldHeight: 400,
		ethanolExcess: 30,
		playSounds: true,
		winningDiff: 3
	},

	AH.Util = {
		assert: function(condition, msg) {
			if(!condition) {
				throw new Error(msg + " " + condition);
			}
		},
		merge: function(base, extend) {
			var dest = {}, key;
			for (key in base) { 
				dest[key] = base[key]; 
			}
			for (key in extend) { 
				dest[key] = extend[key]; 
			}
			return dest;
		},
		rndIntWithin: function(min, max) {
			return Math.round(Math.random() * (max - min) + min);
		},
		rndIntSwitch: function(onValue, offValue) {
			return Math.random() >= .5 ? onValue : offValue;
		},
		getElement: function(id) { 
			return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id); 
		},
		getHTML: function(id) { 
  			AH.Util.getElement(id).innerHTML;
  		},
  		setHTML: function(id, html) { 
  			AH.Util.getElement(id).innerHTML = html;
  		},
  		show: function(element, visible) {
  			AH.Util.getElement(element).style.display = visible ? 'block' : 'none';      
  		},
  		hasClass: function(element, klass) {
    		return element.className.match(new RegExp('(\\s|^)' + klass + '(\\s|$)'));
		},
		removeClass: function (element, klass) {
	        if (AH.Util.hasClass(element,klass)) {
	            var reg = new RegExp('(\\s|^)' + klass + '(\\s|$)');
	            element.className = element.className.replace(reg,' ');
	        }
	        return element;
    	},
    	addClass: function (element, klass) {
    		if (!AH.Util.hasClass(element, klass)) {
    			element.className += " " + klass;
    		}
    		return element;
    	}
	},

	AH.Sounds = (function() {
		var sounds = document.getElementsByTagName("audio");
		return {
			play: function(index) {
				var snd;
				if (sounds[index]) {
					snd = sounds[index];
					if(snd.volume) {
						snd.volume = .1;
					}
					if (snd.play) {
						snd.play();
					}
				}
			}
		}
	})();

	AH.Pong = (function(options) {

		var options = AH.Util.merge(AH.Defaults, options); 

		var Model = function(game) {
			this.gameObjects = game.gameObjects;
			this.displayObjects = [this.gameObjects.paddleHome, this.gameObjects.paddleAway, this.gameObjects.ball];
			this.observers = [];
			this.homeScore = 0;
			this.awayScore = 0;
			this.gameOver = false;
			this.winner;
		};

		Model.prototype.addObserver = function(observer) {
			this.observers.push(observer);
		};

		Model.prototype.invalidate = function() {
			for (var i = 0; i < this.observers.length; i++) {
				this.observers[i].notify(this);
			}
		}

		var RenderView = function (canvas, model) {
			this.ctx 	= canvas.getContext("2d");
			this.w 		= canvas.width;
			this.h 		= canvas.height;
			this.sb1x 	= this.w/4 - 10;
			this.sb2x 	= this.w - this.w/4 - 10;
			this.model 	= model;
			this.model.addObserver(this);
			this.initContext();
		};

		RenderView.prototype = {
			initContext: function() {
				this.ctx.fillStyle 		= options.objectColor;
				this.ctx.strokeStyle 	= options.strokeColor;
				this.ctx.lineWidth 		= options.lineWidth;
				this.ctx.font 			= options.font;
			},
			background: function() {
				var ctx = this.ctx;
				ctx.clearRect(0, 0, this.w, this.h);
				ctx.beginPath();
				ctx.moveTo(this.w/2,0);
				ctx.lineTo(this.w/2,this.h);
				ctx.stroke();
				ctx.fillText(this.model.homeScore, this.sb1x, 40);
				ctx.fillText(this.model.awayScore, this.sb2x, 40);
			},
			render: function() {
				this.background();
				for (var i = 0; i < this.model.displayObjects.length; i++) {
					this.model.displayObjects[i].render(this.ctx);
				}
			},
			notify: function(observable) {
				this.render();
			},
			clear: function() {
			}
		};

		var Controller  = function(model) {
			this.model = model;
			var that = this;
			window.onkeydown = function(event) {
				var k = event.which,
					kc = AH.CONSTS.KEYS,
					v = options.paddleSpeed,
					gobs = that.model.gameObjects;
			 	if (k === kc.Q) {
			 		gobs.paddleHome.vy = -v;
			 	} else if (k === kc.A) {
			 		gobs.paddleHome.vy = v;
			 	} else if (k === kc.P) {
			 		gobs.paddleAway.vy = -v;
			 	} else if (k === kc.L) {
			 		gobs.paddleAway.vy = v;
			 	}
			};
		};

		var AIStrategy = {
			init: function(model, type) {
				var step = 0,
					active;
				strategies = {
					unbeatable: function(obj) {
						obj.y = model.gameObjects.ball.y;
					},
					drunk: function(obj) {
						var ethanol = Math.sin(step++/45 * Math.PI) * options.ethanolExcess;
						obj.y = model.gameObjects.ball.y + ethanol;
					},
					nervous: function(obj) {
						if(step++ % 50 === 0) {
							obj.y = Math.random() * options.fieldHeight;
						}
					},
					phobic: function(obj) {
						obj.y = options.fieldHeight - model.gameObjects.ball.y;
					}
				}
				active = strategies[type || 'unbeatable'];
				return active;
			}
		};

		var Game = function(canvas) {
			AH.Util.assert(canvas && canvas.getContext("2d"), "RenderView needs a 2d canvas to draw upon");
			this.canvas = canvas;
			this.w = canvas.width;
			this.h = canvas.height;
			this.gameObjects = {
				paddleHome: GameObjectFactory.createPaddle(10, this.h/2),
				paddleAway: GameObjectFactory.createPaddle(this.w - 20, this.h/2),
				ball: GameObjectFactory.createBall(80, 200)
			};
			this.centerBall();
			this.model = new Model(this);
			var ai = new AIStrategy.init(this.model, "jumper");
			this.gameObjects.paddleAway.ai = ai;
			this.view = new RenderView(canvas, this.model);
			this.controller = new Controller(this.model);
			this.view.render();
			this.started = false;

			var that = this;
			var gameLoop = function() {
				window.requestAnimFrame(gameLoop);
				that.update();
			}
			window.requestAnimFrame(gameLoop);
		};

		Game.prototype = {

			playWith: function(nPlayers) {
				this.nPlayers = nPlayers;
			},
			start: function() {
				this.centerBall();
				this.started = true;
			},
			stop: function() {
				this.started = false;
			},
			reset: function() {
				this.model.homeScore = this.model.awayScore = 0;
				this.centerBall();
				this.model.invalidate();
			},
			centerBall: function() {
				var ball = this.gameObjects.ball;
				ball.x = this.w/2 - ball.w/2;
				ball.y = this.h/2 - ball.h/2;
				ball.vx *= AH.Util.rndIntSwitch(-1,1);
				ball.vy *= AH.Util.rndIntSwitch(-1,1);
			},
			gameOver: function(winner) {
				this.stop();
				UI.showGameOver(winner);
			},
			pointMade: function(player) {
				player === 1 ? this.model.homeScore++ : this.model.awayScore++;
				if (this.model.homeScore - this.model.awayScore >= options.winningDiff) {
					this.gameOver(1);
				} else if (this.model.awayScore - this.model.homeScore  >= options.winningDiff) {
					this.gameOver(2);
				}
				this.centerBall();
			},
			playSound: function(type) {
				if(options.playSounds) {
					AH.Sounds.play(type);
				}
			},
			setAI: function(aiKey) {
				var paddle = this.gameObjects.paddleAway,
					newAI;
				if(!aiKey || aiKey === "0") {
					paddle.ai = undefined;
				} else {
					newAI = new AIStrategy.init(this.model, aiKey.toLowerCase());
					paddle.ai = newAI;
				}
			},
			update: function() {

				if (this.started) {
				
					var sprite, 
						goh = this.gameObjects,
						ball = goh.ball,
						paddleHome = goh.paddleHome,
						paddleAway = goh.paddleAway,
						game = this.game,
						sndcnst = AH.CONSTS.SOUNDS;

					for(var dispObj in goh) {
						goh[dispObj].update();
					}

					var hitHomePaddle = ball.x < (paddleHome.x + paddleHome.w) && 
										ball.y > (paddleHome.y - ball.h) && 
										ball.y < (paddleHome.y + paddleHome.h);

					if (hitHomePaddle) {
						this.playSound(sndcnst.HIT);
						ball.vx *= -1;
						ball.x = paddleHome.x + paddleHome.w + 1;
					}

					var hitAwayPaddle = ball.x > (paddleAway.x - ball.w) && 
										ball.y > (paddleAway.y - ball.h) && 
										ball.y < (paddleAway.y + paddleAway.h);

					if (hitAwayPaddle) {
						this.playSound(sndcnst.HIT);
						ball.vx *= -1;
						ball.x = paddleAway.x - ball.w;
					}

					if (ball.x < 0) {
						this.playSound(sndcnst.LOOSE);
						this.pointMade(2);
					}

					if (ball.x - ball.w > this.w) {
						this.playSound(sndcnst.WIN);
						this.pointMade(1);
					}

					this.model.invalidate();
				}
			}
		};

		var GameObjectFactory = {
			createPaddle: function(x, y) {
				return new Paddle (
					x, 
					y, 
					options.paddleWidth, 
					options.paddleHeight, 
					0, 
					0, 
					{top: 0, left: x, right: x + options.paddleWidth, bottom: options.fieldHeight}
				)
			},
			createBall: function(x, y) {
				return new Ball (
					x, 
					y, 
					options.ballRadius, 
					options.ballSpeed, 
					options.ballSpeed, 
					{top: 0, left: 0, right: options.fieldWidth, bottom: options.fieldHeight}
				)
			}
		}

		/**
		 * Sprite and all inheriting DisplayObjects
		 */

		var MoveableAISprite = function(x, y, w, h, vx, vy, constraintRect) {
			this.sx = this.x = x || 0;
			this.sy = this.y = y || 0;
			this.w = w || 0;
			this.h = h || 0;
			this.vx = vx || 0;
			this.vy = vy || 0;
			this.cr = constraintRect || {}; //rectangle within moves are allowed
		}

		var Paddle = function (x, y, w, h, vx, vy, constraintRect) {
			MoveableAISprite.call(this, x, y, w, h, vx, vy, constraintRect);
			this.ai;
		}

		Paddle.prototype = new MoveableAISprite();

		Paddle.prototype = {

			constructor: Paddle,
			render: function(ctx) {
				ctx.fillRect(this.x, this.y, this.w, this.h);
				return this;
			},
			update: function() {
				var top = this.cr.top, bottom = this.cr.bottom;
				if (this.ai instanceof Function) {
					this.ai(this);
				} else {
					this.x += this.vx;
					this.y += this.vy;
				}
				
				if (this.y < top) {
					this.y = top;
				} else if ((this.y + this.h) > bottom) {
					this.y = bottom-this.h;
				}
			},
			reset: function() {
				this.x = this.sx;
				this.y = this.sy;
				this.vx = 0;
				this.vy = 0;
			}
		}

		var Ball = function(x, y, r, vx, vy, constraintRect, ai) {
			MoveableAISprite.call(this, x, y, 2*r, 2*r, vx, vy, constraintRect, ai);
			this.r = r || 0;
			this.two_pi = AH.CONSTS.MATH.TWO_PI; //used per frame, keep it close
		}

		Ball.prototype = new MoveableAISprite();

		Ball.prototype = {

			constructor: Ball,
			render: function(ctx) {
				ctx.beginPath();
				ctx.arc(this.x + this.r, this.y + this.r, this.r, 0, this.two_pi, true); 
				ctx.closePath();
				ctx.fill();
				return this;
			},
			update: function() {
				var top = this.cr.top, bottom = this.cr.bottom;
				this.x += this.vx;
				this.y += this.vy;
				//conostraints
				if (this.y < top) {
					this.y = top;
					this.vy *= -1;
				} else if ((this.y + this.h) > bottom) {
					this.y = bottom-this.h;
					this.vy *= -1;
				}
			}
		}
		
		var UI = {
			screens: [],
			init: function (canvas) {
			 	var game = new Game(canvas),
			 		util = AH.Util,
			 		playButton 			= util.getElement("playButton"),
			 		replayButton 		= util.getElement("replayButton"),
			 		aiSelect 			= util.getElement("aiSelect"),
			 		resetButton 		= util.getElement("resetButton"),
			 		coverScreen 		= util.getElement("cover"),
			 		instructionsScreen 	= util.getElement("instructions"),
			 		gameOverScreen 		= util.getElement("gameOver");

			 	UI.screens["cover"] = coverScreen;
			 	UI.screens["instructions"] = instructionsScreen;
			 	UI.screens["gameOver"] = gameOverScreen;

			 	var startup = function() {
				 	var util = AH.Util;
			 		util.removeClass(coverScreen, 'startUp');
			 		util.removeClass(instructionsScreen, 'startUp');
			 	}

			 	replayButton.onclick = playButton.onclick = function() {
		 			util.addClass(coverScreen, 'hidden');
		 			util.addClass(instructionsScreen, 'hidden');
		 			util.addClass(gameOverScreen, 'hidden');
		 			util.show(canvas, true);
		 			game.reset();
		 			setTimeout(function() {
		 				game.start();
		 				util.show(coverScreen, false);
		 				util.show(instructionsScreen, false);
		 				util.show(gameOverScreen, false);
		 			}, 1000);
			 	}

			 	resetButton.onclick = function() {
			 		game.reset();
			 	}

			 	aiSelect.onchange = function() {
			 		console.log("ai selected " + this.value);
			 		game.setAI(this.value);
			 	}

			 	setTimeout(startup, 250);

			 	//UI.show("gameOver");
			 },
			 showGameOver: function(winner) {
			 	var gameOverScreen = UI.screens["gameOver"],
			 		instructionsScreen = UI.screens["instructions"];
			 	AH.Util.show(gameOverScreen, true);
			 	AH.Util.removeClass(gameOverScreen, 'hidden');
			 	var h4 = gameOverScreen.getElementsByTagName("h4")[0];
			 	h4.innerHTML = h4.innerHTML.replace(/.*/i, "PLAYER " + winner + " WINS!");
			 	//gameOverScreen.innerHTML = gameOverScreen.innerHTML
			 }
		}

		//ecpose Pong
		return {
		 	init: UI.init
		 };

	})();

	window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame;
	})();

})(this, document);