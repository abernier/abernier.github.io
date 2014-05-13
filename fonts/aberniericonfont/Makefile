fontname = aberniericonfont

index.html: .FORCE
	fontcustom compile src/ -f $(fontname) -o . --no-hash --quiet --templates=preview
	test -f index.html || ln -s $(fontname)-preview.html index.html

.PHONY: clean
clean:
	-rm $(fontname)* index.html .fontcustom-manifest.json

.FORCE: