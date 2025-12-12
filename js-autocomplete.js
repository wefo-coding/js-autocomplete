/**
 * JavaScript Autocomplete.
 * 
 * Link:    https://github.com/wefo-coding/js-autocomplete
 * Author:  Florian Otten
 * Version: 2.1.0
 */

(function (global) {

    // Utility: URL-encode values for the hidden input
	function encodeValue(v) {
		return encodeURIComponent(v);
	}
	function decodeValue(v) {
		try { return decodeURIComponent(v); } catch { return v; }
	}

	function convert(select) {
		if (
			!(select instanceof HTMLElement) ||
			select.tagName.toLowerCase() !== 'select' ||
			!select.classList.contains('autocomplete')
		) return;

		var form = select.closest('form');
		if (form) form.setAttribute('autocomplete', 'off');

		var options = Array.from(select.getElementsByTagName('option')).map(option => ({
			text: option.textContent || "",
			value: option.value || ""
		}));

		var isMultiple = select.hasAttribute("multiple");
		var allowNew = select.hasAttribute("data-allow-new");

		var wrapper = global.document.createElement('div');
		wrapper.classList.add('autocomplete');
		select.parentNode.insertBefore(wrapper, select);

		var hidden = global.document.createElement('input');
		hidden.setAttribute('type', 'hidden');
		hidden.setAttribute('name', select.getAttribute('name') || "");
		wrapper.appendChild(hidden);

		var selectedValues = [];

		if (!isMultiple) {
			// SINGLE SELECT MODE
			var input = global.document.createElement(
				select.classList.contains('textarea') ? 'textarea' : 'input'
			);
			input.setAttribute('id', select.getAttribute('id') || ("ac-" + Math.random().toString(36).slice(2)));
			input.setAttribute('type', 'text');
			input.setAttribute('autocomplete', 'off');
			wrapper.appendChild(input);

			var pre = Array.from(select.options).find(o => o.hasAttribute('selected') && o.value.trim() !== "");
			if (pre) {
				input.value = pre.textContent || "";
				hidden.value = encodeValue(pre.value || "");
			} else {
				hidden.value = "";
			}

			select.remove();
			autocompleteSingle(input, options, hidden, allowNew);
			return;
		}

		// MULTI SELECT MODE
		var tagBox = document.createElement("div");
		tagBox.classList.add("autocomplete-tags");
		wrapper.appendChild(tagBox);

		var input = document.createElement("input");
		input.setAttribute("type", "text");
		input.setAttribute("autocomplete", "off");
		input.classList.add("tag-input");
		input.setAttribute('id', select.getAttribute('id') || ("ac-" + Math.random().toString(36).slice(2)));
		tagBox.appendChild(input);

		Array.from(select.options).forEach(o => {
			if (o.selected && o.value.trim() !== "") {
				addTag(o.textContent || o.value, o.value, false);
			}
		});

		hidden.value = selectedValues.map(encodeValue).join(",");

		select.remove();

		autocompleteMulti(input, options, hidden, selectedValues, addTag, removeTag, allowNew);

		function addTag(text, value, isNew) {
			if (selectedValues.includes(String(value))) return;

			selectedValues.push(String(value));
			hidden.value = selectedValues.map(encodeValue).join(",");

			var tag = document.createElement("span");
			tag.classList.add("tag-item");
			if (isNew) tag.classList.add("tag-new");
			tag.setAttribute("data-value", value);

			var label = document.createElement("span");
			label.classList.add("tag-label");
			label.textContent = text;
			tag.appendChild(label);

			var closeX = document.createElement("button");
			closeX.setAttribute("type", "button");
			closeX.classList.add("tag-remove");
			closeX.setAttribute("aria-label", "Remove " + text);
			closeX.textContent = "×";
			closeX.addEventListener("click", function (e) {
				e.stopPropagation();
				removeTag(value);
			});

			tag.appendChild(closeX);
			tagBox.insertBefore(tag, input);

			input.dispatchEvent(new Event('input'));
		}

		function removeTag(value) {
			var index = selectedValues.indexOf(String(value));
			if (index > -1) {
				selectedValues.splice(index, 1);
			}

			Array.from(tagBox.getElementsByClassName("tag-item")).forEach(t => {
				if (t.getAttribute("data-value") === value) t.remove();
			});

			hidden.value = selectedValues.map(encodeValue).join(",");

			var x = document.getElementsByClassName("autocomplete-items");
			for (var i = 0; i < x.length; i++) {
				if (x[i].parentNode) x[i].parentNode.removeChild(x[i]);
			}

			input.dispatchEvent(new Event('input'));
			input.focus();
		}
	}

	// MULTI AUTOCOMPLETE
	function autocompleteMulti(inp, arr, hiddenInput, selectedValues, addTag, removeTag, allowNew) {
		var currentFocus = -1;

		// BLUR EVENT: Validierung beim Verlassen (fängt auch normales Tabben ab)
		inp.addEventListener("blur", function () {
			setTimeout(() => {
				var val = inp.value.trim();
				if (!val) return;

				var exactMatch = arr.find(o => o.text.toLowerCase() === val.toLowerCase());

				if (exactMatch) {
					if (!selectedValues.includes(String(exactMatch.value))) {
						addTag(exactMatch.text, exactMatch.value, false);
					}
					inp.value = "";
				} else if (allowNew) {
					addTag(val, val, true);
					inp.value = "";
				} else {
					inp.value = "";
				}
				closeAllLists();
			}, 200);
		});

		inp.addEventListener("input", function () {
			buildList(this.value);
		});

		inp.addEventListener("keydown", function (e) {
			var list = document.getElementById(this.id + "autocomplete-list");
			var items = list ? list.getElementsByTagName("div") : null;

			if (e.key === "ArrowDown") {
				currentFocus++;
				addActive(items);
				e.preventDefault();
			} else if (e.key === "ArrowUp") {
				currentFocus--;
				addActive(items);
				e.preventDefault();
			} else if (e.key === "Enter" || e.key === "Tab") {
				// Tab und Enter verhalten sich gleich, wenn ein Item markiert ist
				if (items && currentFocus > -1 && items[currentFocus]) {
					e.preventDefault(); // Verhindert bei Tab das Springen, wenn explizit ausgewählt wird
					if (!items[currentFocus].classList.contains("already-selected")) {
						items[currentFocus].click();
					}
				} else if (e.key === "Enter" && allowNew) {
					// Nur bei Enter wird Freitext explizit getriggert (Tab wird vom Blur Event gehandhabt)
					e.preventDefault();
					handleCommaOrEnterBehavior(this.value, inp, arr, addTag, hiddenInput, selectedValues);
				}
				// Wenn Tab gedrückt wird und nichts markiert ist:
				// Wir machen KEIN preventDefault. Der Fokus springt weiter,
				// und das "blur" Event kümmert sich um das Speichern des Textes.
			}
		});

		function buildList(val) {
			closeAllLists();
			if (!val) return;
			currentFocus = -1;

			var a = document.createElement("DIV");
			a.setAttribute("id", inp.id + "autocomplete-list");
			a.setAttribute("class", "autocomplete-items");
			inp.parentNode.appendChild(a);

			var q = val.toUpperCase();
			for (var i = 0; i < arr.length; i++) {
				var item = arr[i];
				if (item.text.toUpperCase().indexOf(q) >= 0) {
					var isSelected = selectedValues.includes(String(item.value));
					var b = document.createElement("DIV");
					var pos = item.text.toUpperCase().indexOf(q);
					b.innerHTML = item.text.substr(0, pos)
						+ "<strong>" + item.text.substr(pos, val.length) + "</strong>"
						+ item.text.substr(pos + val.length);

					var hv = document.createElement("input");
					hv.type = "hidden";
					hv.value = item.value;
					b.appendChild(hv);

					if (isSelected) {
						b.classList.add("already-selected");
					} else {
						b.classList.remove("already-selected");
						b.addEventListener("click", (function (it) {
							return function (e) {
								addTag(it.text, it.value, false);
								inp.value = "";
								hiddenInput.value = selectedValues.map(encodeValue).join(",");
								closeAllLists();
								inp.focus();
							};
						})(item));
					}
					a.appendChild(b);
				}
			}
		}

		function handleCommaOrEnterBehavior(value, inpElem, arr, addTagFn, hiddenInput, selectedValuesArr) {
			var trimmed = (value || "").trim();
			if (!trimmed) return;
			var exact = arr.find(o => o.text.toLowerCase() === trimmed.toLowerCase());
			if (exact) {
				if (!selectedValuesArr.includes(String(exact.value))) {
					addTagFn(exact.text, exact.value, false);
					hiddenInput.value = selectedValuesArr.map(encodeValue).join(",");
				}
				inpElem.value = "";
				closeAllLists();
				inpElem.focus();
				return;
			}
			var newValue = trimmed;
			addTagFn(trimmed, newValue, true);
			hiddenInput.value = selectedValuesArr.map(encodeValue).join(",");
			inpElem.value = "";
			closeAllLists();
			inpElem.focus();
		}

		function addActive(x) {
			if (!x) return false;
			removeActive(x);
			if (currentFocus >= x.length) currentFocus = 0;
			if (currentFocus < 0) currentFocus = x.length - 1;
			x[currentFocus].classList.add("autocomplete-active");
			x[currentFocus].scrollIntoView({ block: "nearest" });
		}

		function removeActive(x) {
			for (var i = 0; i < x.length; i++) {
				x[i].classList.remove("autocomplete-active");
			}
		}

		function closeAllLists(elmnt) {
			var x = document.getElementsByClassName("autocomplete-items");
			for (var i = 0; i < x.length; i++) {
				if (elmnt != x[i] && elmnt != inp) {
					x[i].parentNode.removeChild(x[i]);
				}
			}
			currentFocus = -1;
		}

		global.addEventListener("click", function (e) {
			closeAllLists(e.target);
		});
	}

	// SINGLE AUTOCOMPLETE
	function autocompleteSingle(inp, arr, hiddenInput, allowNew) {
		var currentFocus = -1;
		var lastValidText = inp.value;

		inp.addEventListener("blur", function () {
			setTimeout(() => {
				var val = inp.value.trim();
				var exactMatch = arr.find(o => o.text.toLowerCase() === val.toLowerCase());

				if (exactMatch) {
					inp.value = exactMatch.text;
					hiddenInput.value = encodeValue(exactMatch.value);
					lastValidText = exactMatch.text;
				} else if (allowNew && val !== "") {
					hiddenInput.value = encodeValue(val);
					lastValidText = val;
				} else {
					if (val === "") {
						hiddenInput.value = "";
						lastValidText = "";
					} else {
						inp.value = lastValidText;
					}
				}
				closeAllLists();
			}, 200);
		});

		inp.addEventListener("input", function () {
			var val = this.value;
			closeAllLists();
			if (!val) {
				hiddenInput.value = "";
				return false;
			}
			currentFocus = -1;

			var a = document.createElement("DIV");
			a.setAttribute("id", this.id + "autocomplete-list");
			a.setAttribute("class", "autocomplete-items");
			this.parentNode.appendChild(a);

			var q = val.toUpperCase();
			for (var i = 0; i < arr.length; i++) {
				if (arr[i].text.toUpperCase().indexOf(q) >= 0) {
					var b = document.createElement("DIV");
					var pos = arr[i].text.toUpperCase().indexOf(q);
					b.innerHTML = arr[i].text.substr(0, pos)
						+ "<strong>" + arr[i].text.substr(pos, val.length) + "</strong>"
						+ arr[i].text.substr(pos + val.length);

					var hv = document.createElement("input");
					hv.type = "hidden";
					hv.value = arr[i].value;
					hv.setAttribute("data-text", arr[i].text);
					b.appendChild(hv);

					b.addEventListener("click", (function (item) {
						return function (e) {
							inp.value = item.text;
							hiddenInput.value = encodeValue(item.value);
							lastValidText = item.text;
							closeAllLists();
						};
					})(arr[i]));

					a.appendChild(b);
				}
			}
		});

		inp.addEventListener("keydown", function (e) {
			var x = document.getElementById(this.id + "autocomplete-list");
			if (x) x = x.getElementsByTagName("div");

			if (e.key === "ArrowDown") {
				currentFocus++;
				addActive(x);
				e.preventDefault();
			} else if (e.key === "ArrowUp") {
				currentFocus--;
				addActive(x);
				e.preventDefault();
			} else if (e.key === "Enter" || e.key === "Tab") {
				if (currentFocus > -1 && x && x[currentFocus]) {
					e.preventDefault(); // Bei Auswahl Fokus behalten (verhindert Sprung bei Tab)
					x[currentFocus].click();
				} else if (e.key === "Enter" && allowNew) {
					// Bei Enter & AllowNew: Explizit übernehmen
					handleSingleCommaOrEnter(this.value, arr, inp, hiddenInput);
					lastValidText = this.value;
				}
				// Bei Tab ohne Auswahl: Default zulassen (Fokus springt), Blur Event speichert den Wert.
			}
			// Komma-Logik entfernt
		});

		function handleSingleCommaOrEnter(value, arr, inpElem, hiddenIn) {
			var trimmed = (value || "").trim();
			if (!trimmed) return;
			var exact = arr.find(o => o.text.toLowerCase() === trimmed.toLowerCase());
			if (exact) {
				inpElem.value = exact.text;
				hiddenIn.value = encodeValue(exact.value);
				closeAllLists();
				return;
			}
			inpElem.value = trimmed;
			hiddenIn.value = encodeValue(trimmed);
			closeAllLists();
		}

		function addActive(x) {
			if (!x) return false;
			removeActive(x);
			if (currentFocus >= x.length) currentFocus = 0;
			if (currentFocus < 0) currentFocus = (x.length - 1);
			x[currentFocus].classList.add("autocomplete-active");
			x[currentFocus].scrollIntoView({ block: "nearest" });
		}

		function removeActive(x) {
			for (var i = 0; i < x.length; i++) {
				x[i].classList.remove("autocomplete-active");
			}
		}

		function closeAllLists(elmnt) {
			var x = document.getElementsByClassName("autocomplete-items");
			for (var i = 0; i < x.length; i++) {
				if (elmnt != x[i] && elmnt != inp) {
					x[i].parentNode.removeChild(x[i]);
				}
			}
			currentFocus = -1;
		}

		global.addEventListener('click', function (e) {
			closeAllLists(e.target);
		});
	}

	function init() {
		Array.from(global.document.getElementsByTagName('select')).forEach(function (select) {
			if (select.classList.contains('autocomplete')) convert(select);
		});
	}
	global.addEventListener('load', init);

	const observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			mutation.addedNodes.forEach(function (node) {
				if (node !== null && node instanceof HTMLElement) {
					if (node.tagName === 'SELECT') {
						convert(node);
					}
					else {
						Array.from(node.getElementsByTagName('select')).forEach(function (select) {
							if (select.classList.contains('autocomplete')) convert(select);
						});
					}
				}
			});
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

}(window));