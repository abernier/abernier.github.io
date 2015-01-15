fontname = cogedimiconfont

$(fontname).css: .FORCE
	fontcustom compile src/ -f $(fontname) -o . --no-hash --quiet --templates=preview css

.PHONY: clean
clean:
	-rm $(fontname)*

.FORCE: