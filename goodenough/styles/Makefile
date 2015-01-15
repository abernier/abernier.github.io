.PHONY: build
build: index.css

.PHONY: watch
watch:
	watch make build

STYL_FILES = $(shell find . -type f -name '*.styl')
index.css: bin/stylus.js $(STYL_FILES)
	node bin/stylus.js > $@

.PHONY: mostlyclean
mostlyclean:
	rm -Rf index.css

.PHONY: clean
clean:
	$(MAKE) mostlyclean