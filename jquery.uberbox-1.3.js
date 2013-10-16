
/*

OMG V2!

Slide gets up down left right
Specify individual transitions by passing multiple transition objects to the transition option in an array!
Methods! to, next, previous, pause, play, playPause
Bind to events! onNext, onPrevious, onPlay, onPause, onTo, onTransition, onTransitionComplete, onInit, onInitComplete, onInitEvents, onStartTimer, onClearTimer
Added waitForTransition option
If waitForTransition is false the behaviour for rapidly cycling through slides has improved by finishing the transitions immediatly
Customize the pager, thumber and slideshow list elements. Use ul > li's or straight divs, whatever floats your boat.



Want to do:
Plugins! Easily make plugins that tie directly into the uberbox events
*/

(function( $ ){

    var uberbox = function (element, options) {
        this.version = "1.3rc1";
        this.options = options;
        this.$element = $(element);
        this.$container = $(this.$element.find( this.options.containerElement )[0]);
        this.animating = false;
        this.paused = true;
        if( this.$container == undefined ) $.error( "container '" + this.options.containerElement + "' not found within uberbox, check options.containerElement for incorrect targeting" );
        this._setup();
    }

    uberbox.prototype = {
        _setup: function() {
            var options = this.options,
                proxy = this;

            this.options.onSetup( this );

            if( options.width > 0 ) this.$element.css( "width", options.width );
            if( options.height > 0 ) this.$element.css( "height", options.height );

            options.width = this.$element[0].style.width; //because jquery converts it to pixels (we want to allow percentages as well)
            options.height = this.$element[0].style.height;

            this.$element.css( { "position": "relative",  "overflow": "hidden" } );
            this.$container.css( { width: options.width, height: options.height } );

            if( options.source.url != "" ) {
                var j = $.ajax({
                    url: options.source.url,
                    dataType: "jsonp",
                    crossDomain: true,
                    success: function( r ) {
                        var html = "";
                        $.each( r, function() {
                            var data = "";
                            if( this.thumb != undefined && this.thumb != "") {
                                data += " data-thumb=\"" + this.thumb + "\"";
                            }
                            html += "<" + proxy.options.slideElement + ""+data+">" +  this.html + "</" + proxy.options.slideElement + ">";
                        });
                        proxy.$container.html( html );
                        proxy._init();
                    }
                });
            } else {
                this._init();
            }
        },
        _init: function() {
            var options = this.options,
                proxy = this;

            this.$container.find( this.options.slideElement + ":not(:first)" ).css( "display", "none" );

            if( this.options.nextButton != "" && ($nextButton = $(this.options.nextButton)).length != 0 )
                $nextButton.live("click", function() { proxy.next(); });

            if( this.options.previousButton != "" && ($previousButton = $(this.options.previousButton)).length != 0 )
                $previousButton.live("click",function() { proxy.previous(); });

            if( this.options.playPauseButton != "" && ($pauseToggleButton = $(this.options.playPauseButton)).length != 0 )
                $pauseToggleButton.live("click",function() { proxy.playPause(); });

            if( this.options.pager != "" && ($pagerElement = $(this.options.pager)).length != 0) {
                if( $pagerElement.find( this.options.pagerItemElement ).length == 0 ) {
                    var pagerContent = "",
                        i = 0;
                    this.$container.find( this.options.slideElement ).each( function() {
                        pagerContent += "<"+proxy.options.pagerItemElement + ">" + (++i) + "</"+proxy.options.pagerItemElement + ">";
                    })
                    $pagerElement.append( pagerContent );
                }
                $pagerElement.find( this.options.pagerItemElement ).live( "click", function() {
                    proxy.to( $(this).parent().children().index(this)+1 );
                });
            }
            if( this.options.thumber != "" && ($thumberElement = $(this.options.thumber)).length != 0) {
                if( $thumberElement.find( this.options.thumberItemElement ).length == 0 ) {
                    var thumberContent = "",
                        i = 0;
                    this.$container.find( this.options.slideElement ).each( function() {
                        thumberContent += "<"+proxy.options.thumberItemElement + ">"
                                            + ( $(this).data("thumb") != undefined && $(this).data("thumb") != "" ?
                                                "<img src=\"" + $(this).data("thumb") + "\" alt=\"\" />":++i)
                                            + "</"+proxy.options.thumberItemElement + ">";
                    })
                    $thumberElement.append( thumberContent );
                }
                $thumberElement.find( this.options.thumberItemElement ).live( "click", function() {
                    proxy.to( $(this).parent().children().index(this)+1 );
                });
            }

            this._setActiveSlide(  this.$container.find( this.options.slideElement + ":" + (( this.options.startSlide > 0 ) ? "nth-child(" +this.options.startSlide + ")" : "first") ) );
            this._initEvents();

            if( this.options.auto ) {
                this.paused = false;
                this._startTimer(true);
            }

            this.options.onInitComplete( this );
        },
        _initEvents: function() {
            var proxy = this;
            this.$element.mouseenter(function(){
                if (proxy.options.pauseOnHover) proxy.pause();
            }).mouseleave(function(){
                if (proxy.options.pauseOnHover) proxy.play();
            });
            this.options.onInitEvents( this );
        },
        _startTimer: function( includeStartDelay ) {
            this.options.onStartTimer( this );
            this.timeout = setTimeout( $.proxy(this.next, this), (includeStartDelay && this.options.startDelay > 0 ? this.options.startDelay : this.options.speed) );
        },
        _clearTimer: function() {
            this.options.onClearTimer( this );
            clearTimeout( this.timeout );
        },
        _setActiveSlide: function( slide ) {
            slide.siblings(".active").removeClass("active");
            slide.addClass("active");
            var activeSlideIndex = $(slide).parent().children().index(slide);
            if( this.options.pager != "" && ($pagerElement = $(this.options.pager)).length != 0) {
                $pagerElement.children(".active").removeClass("active");
                $($pagerElement.children()[activeSlideIndex]).addClass("active");
            }
            if( this.options.thumber != "" && ($thumberElement = $(this.options.thumber)).length != 0) {
                $thumberElement.children(".active").removeClass("active");
                $($thumberElement.children()[activeSlideIndex]).addClass("active");
            }
        },
        _transition: function (next) {
            var proxy = this,
                active = this.$container.find( this.options.slideElement + ".active" );
            if( next.is( active ) ) return false;

            if( this.animating && this.options.waitForTransition ) return false;
            if( this.animating && !this.options.waitForTransition ) {
                this.$container.find( this.options.slideElement ).stop( true, true );
            }
            this.animating = true;

            this._clearTimer();

            var transition = this.options.transition;
            if( this.options.transition == "random") {
                var effects = ['fade','wipe','slide'];
                var directions = [ 'up','down','left','right'];
                transition = { fx: effects[Math.floor(Math.random() * effects.length)], direction: directions[Math.floor(Math.random() * directions.length)], speed: "slow" };
            } else if( this.options.transition instanceof Array ) {
                if( !(transition = this.options.transition[active.parent().children().index(active)] ) )
                    transition = this.options.transition[0];
            }

            this.options.onTransition( this, active, next );

            if( transition.fx == "fade" ) {
                active.css( { "z-index": 2, position: "absolute", top: 0, left: 0, display: "block", opacity: 1, width: this.options.width, height: this.options.height } );
                next.css( { "z-index": 1, position: "absolute", top: 0, left: 0, display: "block", opacity: 1, width: this.options.width, height: this.options.height } );
                active.fadeOut( transition.speed, function() { proxy._transitionComplete(); } );
            } else if( transition.fx == "slide" ) {
                active.css( { position: "absolute", top: 0, left: 0, width: this.options.width, height: this.options.height } );
                var nextCss = { position: "absolute", display: "block", left: 0, top: 0, width: this.options.width, height: this.options.height };
                switch( transition.direction ) {
                    case 'right':
                        next.css( $.extend( nextCss, { left: "-" + this.options.width }  ) );
                        active.animate( { left: this.options.width }, transition.speed );
                        next.animate( { left: 0 }, transition.speed, function() { proxy._transitionComplete(); } );
                        break;
                    case 'up':
                        next.css( $.extend( nextCss, { top: this.options.height } ) );
                        active.animate( { top: "-" + this.options.height }, transition.speed );
                        next.animate( { top: 0 }, transition.speed, function() { proxy._transitionComplete(); } );
                        break;
                    case 'down':
                        next.css( $.extend( nextCss, { top: "-" + this.options.height } ) );
                        active.animate( { top: this.options.height }, transition.speed );
                        next.animate( { top: 0 }, transition.speed, function() { proxy._transitionComplete(); } );
                        break;
                    case 'left':
                    default: // which is also left
                        next.css( $.extend( nextCss, { left: this.options.width } ) );
                        active.animate( { left: "-" + this.options.width }, transition.speed );
                        next.animate( { left: 0 }, transition.speed, function() { proxy._transitionComplete(); } );
                }
            } else if( transition.fx == "wipe" ) {
                next.css( { "z-index": 1, position: "absolute", width: this.options.width, height: this.options.height, top: 0, left: 0, display: "block", opacity: 1 } );
                active.css( { "z-index": 2, position: "absolute", width: this.options.width, height: this.options.height, overflow: "hidden", top: 0, left: 0, display: "block", opacity: 1 } );
                switch( transition.direction ) {
                    case 'right':
                        active.animate( { marginLeft: this.options.width, width: 0 }, transition.speed, function(){ $(this).css({ marginLeft: 0, width: 0, display: "none" }); proxy._transitionComplete(); } );
                        break;
                    case 'up':
                        active.slideUp();
                        break;
                    case 'down':
                        active.animate( { marginTop: this.options.width, height: 0 }, transition.speed, function(){ $(this).css({ marginTop: 0, height: 0, display: "none" }); proxy._transitionComplete(); } );
                        break;
                    case 'left':
                    default: // which is also left
                        active.animate( { width: 0 }, transition.speed, function(){ $(this).css({ width: 0, display: "none"}); proxy._transitionComplete(); } );
                }
            }

            this._setActiveSlide( next );
        },
        _transitionComplete: function() {
            this.options.onTransitionComplete( this, this.$container.find( this.options.slideElement + ".active" ) );
            this.animating = false;

            if( this.options.auto && !this.paused)
                this._startTimer();
        },
        to: function (e) {
            var next = this.$container.find( this.options.slideElement + ":nth-child(" + e + ")" );
            this.options.onTo( this, next );
            this._transition( next );
        },
        next: function () {
            var next = this.$container.find( this.options.slideElement + ".active" ).next();
            if( next.length == 0 ) next = this.$container.find( this.options.slideElement + ":first" );
            this.options.onNext( this );
            this._transition( next );
        },
        previous: function () {
            var previous = this.$container.find( this.options.slideElement + ".active" ).prev();
            if( previous.length == 0 ) previous = this.$container.find( this.options.slideElement + ":last" );
            this.options.onPrevious( this );
            this._transition( previous );
        },
        pause: function() {
            this.paused = true;
            this.options.onPause( this );
            this._clearTimer();
        },
        play: function() {
            this.paused = false;
            this.options.onPlay( this );
            this._startTimer();
        },
        playPause: function() {
            (this.paused) ? this.play() : this.pause();
        }
    }

    $.fn.uberbox = function( option ) {
        // thanks bootstrap for the following technique
        var uberboxArgs = arguments;
        return this.each(function () {
            var $this = $(this),
                data = $this.data('uberbox'),
                options = $.extend({}, $.fn.uberbox.defaults, typeof option == 'object' && option ),
                action = typeof option == 'string' ? option : false

            if (!data) $this.data('uberbox', (data = new uberbox(this, options)))
            if (typeof option == 'number') data.to(option)
            else if (action) data[action]( Array.prototype.slice.call( uberboxArgs, 1 ) );
        });
    };

    $.fn.uberbox.defaults = {
        width: 0,
        height: 0,
        startDelay: 0,
        startSlide: 0,
        speed: 5000,
        transition: {
            fx: "fade",
            speed: "slow"
        },
        source: null,
        waitForTransition: false,
        nextButton: "",
        previousButton: "",
        playPauseButton: "",
        pager: "",
        thumber: "",
        auto: true,
        pauseOnHover: false,
        containerElement: "ul",
        slideElement: "li",
        pagerItemElement: "li",
        thumberItemElement: "li",
        slices: 15,
        source: {
            url: ""
        },
        onTo: function( uberbox ) {},
        onNext: function( uberbox ) {},
        onPrevious: function( uberbox ) {},
        onTransition: function( uberbox, activeSlide, nextSlide ) {},
        onTransitionComplete: function( uberbox, activeSlide ) {},
        onPlay: function( uberbox ) {},
        onPause: function( uberbox ) {},
        onSetup: function( uberbox ) {},
        onInit: function( uberbox ) {},
        onInitComplete: function( uberbox ) {},
        onInitEvents: function( uberbox ) {},
        onStartTimer: function( uberbox ) {},
        onClearTimer: function( uberbox ) {}
    };

})( jQuery );