(function (win, doc) {
	var
	//
	_defined = function(valA, valB) {
		return valA != undefined ? valA : valB;
	};
	hasTouch = 'ontouchstart' in win;
	startEvent = hasTouch ? 'touchstart' : 'mousedown',
	moveEvent = hasTouch ? 'touchmove' : 'mousemove',
	endEvent = hasTouch ? 'touchend' : 'mouseup',
	transitionEnd = 'webkitTransitionEnd';
	//
	win.Scrollr = function(opts) {
		//
		if (!('WebKitCSSMatrix' in win)) return;
		//
		this.element = _defined(opts.element, opts.constructor == ''.constructor ? doc.getElementById(opts) : opts);
		this.bounceBackTime = _defined(opts.bounceBackTime, 300);
		this.maxBottomOffset = _defined(opts.maxBottomOffset, 100);
		this.maxLeftOffset = _defined(opts.maxLeftOffset, 100);
		this.maxRightOffset = _defined(opts.maxRightOffset, 100);
		this.maxTopOffset = _defined(opts.maxTopOffset, 100);
		//
		this.element.parentNode.style.overflow = 'hidden';
		//
		this.element.addEventListener(startEvent, this, false);
		//
		this.element.style.webkitTransform = 'translate3d(0, 0, 0)';
		//
		return this;
	};
	//
	var _scrollrPrototype = {
		handleEvent: function (e) {
			//
			switch (e.type) {
			case startEvent:
				// stop if multi-touch event
				if (e.touches && e.touches.length > 1) return;
				// events
				doc.addEventListener(moveEvent, this, false);
				doc.addEventListener(endEvent, this, false);
				doc.addEventListener(transitionEnd, this, false);
				this.onTouchStart(e);
				break;
			case moveEvent:
				// events
				e.preventDefault();
				this.onTouchMove(e);
				break;
			case endEvent:
				// events
				doc.removeEventListener(moveEvent, this, false);
				doc.removeEventListener(endEvent, this, false);
				this.onTouchEnd(e);
				break;
			case transitionEnd:
				// events
				doc.removeEventListener(transitionEnd, this, false);
				break;
			}
		},
		setMetrics: function (e) {
			var
			// set variables
			el = this.element,
			computedStyle = doc.defaultView.getComputedStyle(this.element, null),
			transform = new WebKitCSSMatrix(computedStyle.webkitTransform),
			contentHeight = el.clientHeight,
			contentWidth = el.clientWidth,
			elementFrameHeight = el.parentNode.clientHeight,
			elementFrameWidth = el.parentNode.clientWidth;
			// metrics
			this.heightDiff = Math.min(elementFrameHeight - contentHeight, 0);
			this.widthDiff = Math.min(elementFrameWidth - contentWidth, 0);
			this.contentStartOffsetX = transform.m41;
			this.contentStartOffsetY = transform.m42;
		},
		setVelocity: function (e) {
			// client
			var
			eTouches = e.touches,
			clientX = eTouches ? eTouches[0].clientX : e.clientX,
			clientY = eTouches ? eTouches[0].clientY : e.clientY;
			// velocity
			this.velocityX = Math.abs((clientX - this.startTouchX) / (this._endTime - this._startTime));
			this.velocityY = Math.abs((clientY - this.startTouchY) / (this._endTime - this._startTime));
		},
		onTouchStart: function (e) {
			// not touching
			this.touching = true;
			// start time
			this._startTime = e.timeStamp;
			// initialize velocity
			this.velocityX = 1;
			this.velocityY = 1;
			// calculate sizes
			this.setMetrics(e);
			// stop momentum
			this.stopMomentum();
			// start touch
			var eTouches = e.touches;
			this.startTouchX = (eTouches) ? eTouches[0].clientX : e.clientX;
			this.startTouchY = (eTouches) ? eTouches[0].clientY : e.clientY;
		},
		onTouchMove: function (e) {
			// get end velocity
			this.setVelocity(e);
			// disable selection
			this.element.style.WebkitUserSelect = 'none';
			//
			var
			eTouches = e.touches,
			currentX = eTouches ? eTouches[0].clientX : e.clientX,
			currentY = eTouches ? eTouches[0].clientY : e.clientY,
			//
			deltaX = currentX - this.startTouchX,
			deltaY = currentY - this.startTouchY,
			newX = deltaX + this.contentStartOffsetX,
			newY = deltaY + this.contentStartOffsetY;
			//
			this.newX = 
			// scroll exceeds left boundary
			(newX > this.maxLeftOffset)
				? this.maxLeftOffset
				// scroll exceeds right boundary
				: (newX < this.widthDiff - this.maxRightOffset)
					? this.widthDiff - this.maxRightOffset
					: (deltaX * this.velocityX) + this.contentStartOffsetX;
			this.newY = 
			// scroll exceeds top boundary
			(newY > this.maxTopOffset)
				? this.maxTopOffset
				// scroll exceeds bottom boundary
				: (newY < this.heightDiff - this.maxBottomOffset)
					? this.heightDiff - this.maxBottomOffset
					: (deltaY * this.velocityY) + this.contentStartOffsetY;
			//
			this.animateTo(this.newX, this.newY);
		},
		onTouchEnd: function (e) {
			// not touching
			this.touching = false;
			// end time
			this._endTime = e.timeStamp;
			// disable selection
			this.element.style.WebkitUserSelect = '';
			// momentum
			this.doMomentum(e);
		},
		momentumTo: function (offsetX, offsetY) {
			//
			var
			elementStyle = this.element.style;
			//
			this.contentOffsetX = offsetX;
			this.contentOffsetY = offsetY;
			//
			elementStyle.webkitTransition = '-webkit-transform '+this.bounceBackTime+'ms cubic-bezier(0.33, 0.66, 0.66, 1)';
			elementStyle.webkitTransform = 'translate3d('+offsetX+'px, '+offsetY+'px, 0)';
		},
		animateTo: function (offsetX, offsetY) {
			//
			var
			elementStyle = this.element.style,
			transformSpeed = this.bounceBackTime * Math.max(this.velocityX, this.velocityY);
			//
			this.contentOffsetX = offsetX;
			this.contentOffsetY = offsetY;
			//
			elementStyle.webkitTransition = '-webkit-transform '+transformSpeed+'ms cubic-bezier(0.33, 0.66, 0.66, 1)';
			elementStyle.webkitTransform = 'translate3d('+offsetX+'px, '+offsetY+'px, 0)';
		},
		doMomentum: function (e) {
			//
			var
			clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
			// snap top left
			if (this.contentOffsetY > 0 && this.contentOffsetX > 0) this.momentumTo(0, 0);
			// snap top right
			if (this.contentOffsetY > 0 && this.contentOffsetX < this.widthDiff) this.momentumTo(this.widthDiff, 0);
			// snap bottom right
			else if (this.contentOffsetY < this.heightDiff && this.contentOffsetX < this.widthDiff) this.momentumTo(this.widthDiff, this.heightDiff);
			// snap bottom left
			else if (this.contentOffsetY < this.heightDiff && this.contentOffsetX > 0) this.momentumTo(0, this.heightDiff);
			// snap top
			else if (this.contentOffsetY > 0) this.momentumTo(this.newX, 0);
			// snap right
			else if (this.contentOffsetX < this.widthDiff) this.momentumTo(this.widthDiff, this.newY);
			// snap bottom
			else if (this.contentOffsetY < this.heightDiff) this.momentumTo(this.newX, this.heightDiff);
			// snap left
			else if (this.contentOffsetX > 0) this.momentumTo(0, this.newY);
		},
		stopMomentum: function () {
			// set variables
			var
			style = doc.defaultView.getComputedStyle(this.element, null),
			transform = new WebKitCSSMatrix(style.webkitTransform);
			// remove transition time and transform
			this.element.style.webkitTransition = '';
			this.animateTo(transform.m41, transform.m42);
		}
	};
	//
	for (var e in _scrollrPrototype) win.Scrollr.prototype[e] = _scrollrPrototype[e];
	//
})(this, document);
