RESIZEDIMGS = $(addprefix public/, $(shell grep -Eoh  "[a-zA-Z0-9_-]+_[0-9]*x[0-9]*.(png|jpg)" styles/*.styl public/*.html | uniq | sort))

.PHONY: build
build: public/index.css public/head.js public/vendor.js public/index.js
	echo $(RESIZEDIMGS)

public/index.css: styles
	cp styles/index.css $@

.PHONY: styles
styles: $(RESIZEDIMGS)
	$(MAKE) -C styles

public/vendor.js: ./node_modules/.bin/browserify $(shell find node_modules -type f -name '*.js') $(shell find vendor -type f -name '*.js')
	./node_modules/.bin/browserify \
	  -r jquery \
	  -r hammerjs \
	  -r ./vendor/jquery.hammer.js:jquery-hammer \
	  -r underscore \
	  -r backbone \
	  -r ./vendor/jquery.waypoints.js:jquery-waypoints \
	  -r ./vendor/jquery.waypoints-sticky.js:jquery-waypoints-sticky \
	  -r ./vendor/raf.js:raf \
	  -r ./vendor/srcset.js:srcset \
	  -r ./vendor/loop.js:loop \
	  -r ./vendor/animationcanvas.js:animationcanvas \
	  -r carouselview \
	  -r parallax \
	  -r velocity-animate \
	  -r three \
	  -r dat-gui \
	  -r tween \
	  > $@
ifeq ($(ENV), production)
	./node_modules/.bin/uglifyjs $@ -o $@ -m
endif
public/index.js: ./node_modules/.bin/browserify $(shell find browser -type f -name '*.js')
	./node_modules/.bin/browserify \
	  -x jquery \
	  -x hammerjs \
	  -x jquery-hammer \
	  -x underscore \
	  -x backbone \
	  -x jquery-waypoints \
	  -x jquery-waypoints-sticky \
	  -x raf \
	  -x srcset \
	  -x loop \
	  -x animationcanvas \
	  -x carouselview \
	  -x parallax \
	  -x velocity-animate \
	  -x three \
	  -x dat-gui \
	  -x tween \
	  -r ./browser/index.js:Goodenough \
	  > $@
ifeq ($(ENV), production)
	./node_modules/.bin/uglifyjs $@ -o $@ -m
endif

public/head.js: ./vendor/modernizr.js
	cat ./vendor/modernizr.js >> $@
ifeq ($(ENV), production)
	./node_modules/.bin/uglifyjs $@ -o $@ -m
endif	

public/%.png public/%.jpg:
	$(eval FILENAMEWOSIZE = $(shell echo "$(@F)" | awk -F'_[0-9]*x[0-9]*' '{print $$1}'))
	$(eval DOTEXTENSION = $(shell echo "$@" | awk -F'_[0-9]*x[0-9]*' '{print $$2}'))
	$(eval SIZE = $(shell echo "$@" | awk -F'_' '{print $$2}' | awk -F'.' '{print $$1}'))
	
	convert srcimages/$(FILENAMEWOSIZE)$(DOTEXTENSION) -resize $(SIZE) -interpolate bicubic -quality 85 $@

clean:
	$(MAKE) -C styles clean
	#$(MAKE) -C public/fonts/ccciconfont clean
	-rm public/index.css public/index.js public/head.js public/vendor.js $(RESIZEDIMGS)