/**
 * JavaScript Autocomplete.
 * Link: 	 https://github.com/wefo-coding/js-autocomplete
 * Author:	 Florian Otten
 * Version:  2.2.0 (Bug fixes and usability improvements)
 */

(function (global) {

	function encodeValue(v) { return encodeURIComponent(v); }

	function convert(select) {
		if (!(select instanceof HTMLElement) || select.tagName.toLowerCase() !== 'select' || !select.classList.contains('autocomplete')) return;

		var form = select.closest('form');
		if (form) form.setAttribute('autocomplete', 'off');

		var options = Array.from(select.getElementsByTagName('option')).map(option => ({
			text: option.textContent || "",
			value: option.value || ""
		}));

		var isMultiple = select.hasAttribute("multiple");
		var allowNew = select.hasAttribute("data-allow-new");
		var separators = select.getAttribute("data-separator") || "";

		var wrapper = global.document.createElement('div');
		wrapper.classList.add('autocomplete');
		select.parentNode.insertBefore(wrapper, select);

		var hidden = global.document.createElement('input');
		hidden.setAttribute('type', 'hidden');
		hidden.setAttribute('name', select.getAttribute('name') || "");
		wrapper.appendChild(hidden);

		var selectedValues = [];

		if (!isMultiple) {
			var input = global.document.createElement(select.classList.contains('textarea') ? 'textarea' : 'input');
			input.setAttribute('id', select.getAttribute('id') || ("ac-" + Math.random().toString(36).slice(2)));
			input.setAttribute('type', 'text');
			input.setAttribute('autocomplete', 'off');
			wrapper.appendChild(input);

			var pre = Array.from(select.options).find(o => o.hasAttribute('selected') && o.value.trim() !== "");
			if (pre) {
				input.value = pre.textContent || "";
				hidden.value = encodeValue(pre.value || "");
			}
			select.remove();
			autocompleteSingle(input, options, hidden, allowNew);
			return;
		}

		var tagBox = document.createElement("div");
		tagBox.classList.add("autocomplete-tags");
		wrapper.appendChild(tagBox);

		var input = document.createElement("input");
		input.setAttribute("type", "text");
		input.setAttribute("autocomplete", "off");
		input.classList.add("tag-input");
		input.setAttribute('id', select.getAttribute('id') || ("ac-" + Math.random().toString(36).slice(2)));
		tagBox.appendChild(input);

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
			if (index > -1) selectedValues.splice(index, 1);
			Array.from(tagBox.getElementsByClassName("tag-item")).forEach(t => {
				if (t.getAttribute("data-value") === value) t.remove();
			});
			hidden.value = selectedValues.map(encodeValue).join(",");
			input.dispatchEvent(new Event('input'));
			input.focus();
		}

		Array.from(select.options).forEach(o => {
			if (o.selected && o.value.trim() !== "") addTag(o.textContent || o.value, o.value, false);
		});

		hidden.value = selectedValues.map(encodeValue).join(",");
		select.remove();

		autocompleteMulti(input, options, hidden, selectedValues, addTag, removeTag, allowNew, separators);
	}

	function updateActive(items, focusIdx) {
		if (!items || items.length === 0) return -1;
		items.forEach(el => el.classList.remove("autocomplete-active"));
		if (focusIdx >= items.length) focusIdx = 0;
		if (focusIdx < 0) focusIdx = items.length - 1;
		items[focusIdx].classList.add("autocomplete-active");
		items[focusIdx].scrollIntoView({ block: "nearest" });
		return focusIdx;
	}

	function autocompleteMulti(inp, arr, hiddenInput, selectedValues, addTag, removeTag, allowNew, separators) {
		var currentFocus = -1;

		function handleSelection(forceIdx) {
			var list = document.getElementById(inp.id + "autocomplete-list");
			var items = list ? Array.from(list.querySelectorAll("div:not(.already-selected)")) : [];
			var idx = (forceIdx !== undefined) ? forceIdx : currentFocus;

			if (items.length > 0 && idx > -1 && items[idx]) {
				// Triggert den mousedown Event des Elements (egal ob normaler Treffer oder "Neu hinzufügen")
				items[idx].dispatchEvent(new Event('mousedown'));
			} else {
				closeAllLists();
			}
		}

		inp.addEventListener("blur", function () {
			setTimeout(() => handleSelection(), 200);
		});

		inp.addEventListener("keydown", function (e) {
			var list = document.getElementById(this.id + "autocomplete-list");
			var items = list ? Array.from(list.querySelectorAll("div:not(.already-selected)")) : [];

			if (separators.indexOf(e.key) !== -1 && separators !== "") {
				e.preventDefault();
				handleSelection();
				return;
			}

			if (e.key === "ArrowDown") {
				currentFocus++;
				currentFocus = updateActive(items, currentFocus);
				e.preventDefault();
			} else if (e.key === "ArrowUp") {
				currentFocus--;
				currentFocus = updateActive(items, currentFocus);
				e.preventDefault();
			} else if (e.key === "Enter" || e.key === "Tab") {
				if (e.key === "Enter") e.preventDefault();
				if (items.length > 0) {
					if (e.key === "Tab") e.preventDefault();
					handleSelection(currentFocus > -1 ? currentFocus : 0);
				}
			} else if (e.key === "Backspace" && inp.value === "" && selectedValues.length > 0) {
				removeTag(selectedValues[selectedValues.length - 1]);
			}
		});

		inp.addEventListener("input", function () {
			closeAllLists();
			var val = this.value;
			if (!val) return;
			var a = document.createElement("DIV");
			a.setAttribute("id", this.id + "autocomplete-list");
			a.setAttribute("class", "autocomplete-items");
			this.parentNode.appendChild(a);

			var q = val.toUpperCase();
			// 1. Treffer hinzufügen
			for (var i = 0; i < arr.length; i++) {
				if (arr[i].text.toUpperCase().indexOf(q) >= 0) {
					var isSelected = selectedValues.includes(String(arr[i].value));
					var b = document.createElement("DIV");
					var pos = arr[i].text.toUpperCase().indexOf(q);
					b.innerHTML = arr[i].text.substr(0, pos) + "<strong>" + arr[i].text.substr(pos, val.length) + "</strong>" + arr[i].text.substr(pos + val.length);

					if (isSelected) {
						b.classList.add("already-selected");
					} else {
						b.addEventListener("mousedown", (function (it) {
							return function (e) {
								e.preventDefault();
								addTag(it.text, it.value, false);
								inp.value = "";
								closeAllLists();
							};
						})(arr[i]));
					}
					a.appendChild(b);
				}
			}

			// 2. Freitext-Option ans Ende (wenn erlaubt und kein exakter Match)
			if (allowNew && val.trim() !== "") {
				var exactMatch = arr.find(o => o.text.toLowerCase() === val.trim().toLowerCase());
				if (!exactMatch) {
					var n = document.createElement("DIV");
					n.classList.add("autocomplete-new-entry");
					n.innerHTML = 'New entry: "<strong>' + val + '</strong>"';
					n.addEventListener("mousedown", function (e) {
						e.preventDefault();
						addTag(val, val, true);
						inp.value = "";
						closeAllLists();
					});
					a.appendChild(n);
				}
			}

			var selectable = a.querySelectorAll("div:not(.already-selected)");
			if (selectable.length > 0) {
				currentFocus = 0;
				updateActive(Array.from(selectable), currentFocus);
			}
		});

		function closeAllLists(elmnt) {
			var x = document.getElementsByClassName("autocomplete-items");
			for (var i = 0; i < x.length; i++) {
				if (elmnt != x[i] && elmnt != inp) x[i].parentNode.removeChild(x[i]);
			}
			currentFocus = -1;
		}
		global.addEventListener("click", function (e) { closeAllLists(e.target); });
	}

	// SINGLE AUTOCOMPLETE (Gleiche Logik für Form-Submit Protection)
	function autocompleteSingle(inp, arr, hiddenInput, allowNew) {
		var currentFocus = -1;
		var lastValidText = inp.value;

		function closeAllLists(elmnt) {
			var x = document.getElementsByClassName("autocomplete-items");
			for (var i = 0; i < x.length; i++) {
				if (elmnt != x[i] && elmnt != inp) x[i].parentNode.removeChild(x[i]);
			}
			currentFocus = -1;
		}

		inp.addEventListener("blur", function () {
			setTimeout(() => {
				var val = inp.value.trim();
				if (val === "") { hiddenInput.value = ""; lastValidText = ""; closeAllLists(); return; }
				var exactMatch = arr.find(o => o.text.toLowerCase() === val.toLowerCase());
				if (exactMatch) {
					inp.value = exactMatch.text;
					hiddenInput.value = encodeURIComponent(exactMatch.value);
					lastValidText = exactMatch.text;
				} else if (allowNew) {
					hiddenInput.value = encodeURIComponent(val);
					lastValidText = val;
				} else {
					inp.value = lastValidText;
				}
				closeAllLists();
			}, 200);
		});

		inp.addEventListener("keydown", function (e) {
			var list = document.getElementById(this.id + "autocomplete-list");
			var items = list ? Array.from(list.querySelectorAll("div")) : [];
			if (e.key === "Enter") e.preventDefault();
			if (e.key === "ArrowDown") {
				currentFocus++;
				currentFocus = updateActive(items, currentFocus);
				e.preventDefault();
			} else if (e.key === "ArrowUp") {
				currentFocus--;
				currentFocus = updateActive(items, currentFocus);
				e.preventDefault();
			} else if (e.key === "Enter" || e.key === "Tab") {
				if (items.length > 0) {
					if (e.key === "Tab") e.preventDefault();
					var idx = currentFocus > -1 ? currentFocus : 0;
					items[idx].dispatchEvent(new Event('mousedown'));
				}
			}
		});

		inp.addEventListener("input", function () {
			closeAllLists();
			var val = this.value;
			if (!val) { hiddenInput.value = ""; return; }
			var a = document.createElement("DIV");
			a.setAttribute("id", this.id + "autocomplete-list");
			a.setAttribute("class", "autocomplete-items");
			this.parentNode.appendChild(a);
			var q = val.toUpperCase();
			for (var i = 0; i < arr.length; i++) {
				if (arr[i].text.toUpperCase().indexOf(q) >= 0) {
					var b = document.createElement("DIV");
					b.innerHTML = arr[i].text.substr(0, arr[i].text.toUpperCase().indexOf(q)) + "<strong>" + arr[i].text.substr(arr[i].text.toUpperCase().indexOf(q), val.length) + "</strong>" + arr[i].text.substr(arr[i].text.toUpperCase().indexOf(q) + val.length);
					b.addEventListener("mousedown", (function (item) {
						return function (e) {
							e.preventDefault();
							inp.value = item.text;
							hiddenInput.value = encodeURIComponent(item.value);
							lastValidText = item.text;
							closeAllLists();
						};
					})(arr[i]));
					a.appendChild(b);
				}
			}
			var items = a.querySelectorAll("div");
			if (items.length > 0) {
				currentFocus = 0;
				updateActive(Array.from(items), currentFocus);
			}
		});
		global.addEventListener('click', function (e) { closeAllLists(e.target); });
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
				if (node instanceof HTMLElement) {
					if (node.tagName === 'SELECT' && node.classList.contains('autocomplete')) {
						convert(node);
					} else {
						Array.from(node.getElementsByTagName('select')).forEach(function (select) {
							if (select.classList.contains('autocomplete')) convert(select);
						});
					}
				}
			});
		});
	});
	observer.observe(document.body, { childList: true, subtree: true });

}(window));