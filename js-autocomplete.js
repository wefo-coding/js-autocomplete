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

        // Map options -> [{ text, value }]
        var options = Array.from(select.getElementsByTagName('option')).map(option => ({
            text: option.textContent || "",
            value: option.value || ""
        }));

        var isMultiple = select.hasAttribute("multiple");

        var wrapper = global.document.createElement('div');
        wrapper.classList.add('autocomplete');
        select.parentNode.insertBefore(wrapper, select);

        // Hidden field for form submission (values URL-encoded, comma-separated)
        var hidden = global.document.createElement('input');
        hidden.setAttribute('type', 'hidden');
        hidden.setAttribute('name', select.getAttribute('name') || "");
        wrapper.appendChild(hidden);

        var selectedValues = []; // stored as raw values (not encoded)

        if (!isMultiple) {
            // SINGLE SELECT MODE
            var input = global.document.createElement(
                select.classList.contains('textarea') ? 'textarea' : 'input'
            );
            input.setAttribute('id', select.getAttribute('id') || ("ac-" + Math.random().toString(36).slice(2)));
            input.setAttribute('type', 'text');
            input.setAttribute('autocomplete', 'off');
            wrapper.appendChild(input);

            var pre = Array.from(select.options).find(o => o.selected && o.value.trim() !== "");
            if (pre) {
                input.value = pre.textContent || "";
                hidden.value = encodeValue(pre.value || "");
            } else {
                hidden.value = "";
            }

            select.remove();
            autocompleteSingle(input, options, hidden);
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
        // generate an id if none to support list element creation
        input.setAttribute('id', select.getAttribute('id') || ("ac-" + Math.random().toString(36).slice(2)));
        tagBox.appendChild(input);

        // preselected options -> create tags
        Array.from(select.options).forEach(o => {
            if (o.selected && o.value.trim() !== "") {
                addTag(o.textContent || o.value, o.value, false);
            }
        });

        hidden.value = selectedValues.map(encodeValue).join(",");

        select.remove();

        autocompleteMulti(input, options, hidden, selectedValues, addTag, removeTag);

        function addTag(text, value, isNew) {
            if (selectedValues.includes(String(value))) {
                return;
            }

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

            // Insert tag before the input inside tagBox
            tagBox.insertBefore(tag, input);

            // Aktualisiere hidden.value
            hidden.value = selectedValues.map(encodeValue).join(",");

            // Optional: Nach dem Hinzufügen auch ein input Event triggern, um die Liste zu syncen
            input.dispatchEvent(new Event('input'));
        }

        function removeTag(value) {

            var index = selectedValues.indexOf(String(value));
            if (index > -1) {
                selectedValues.splice(index, 1); // Mutation des ursprünglichen Arrays
            }

            // remove tag element(s)
            Array.from(tagBox.getElementsByClassName("tag-item")).forEach(t => {
                if (t.getAttribute("data-value") === value) t.remove();
            });

            // Aktualisiere hidden.value
            hidden.value = selectedValues.map(encodeValue).join(",");


            // Erzwinge das Schließen der Dropdown-Liste
            var x = document.getElementsByClassName("autocomplete-items");
            for (var i = 0; i < x.length; i++) {
                if (x[i].parentNode) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }

            // NEU: Erzwinge ein 'input'-Event, um buildList neu auszulösen
            input.dispatchEvent(new Event('input'));

            input.focus();
        }
    }

    //
    // MULTI AUTOCOMPLETE (with Enter / Comma handling and marking already selected)
    //
    function autocompleteMulti(inp, arr, hiddenInput, selectedValues, addTag, removeTag) {
        var currentFocus = -1;
        var container = inp.parentNode;

        // Hier wird die buildList bei jedem Input-Event aufgerufen
        inp.addEventListener("input", function () {
            buildList(this.value);
        });

        inp.addEventListener("keydown", function (e) {
            var list = document.getElementById(this.id + "autocomplete-list");
            var items = list ? list.getElementsByTagName("div") : null;

            // Arrow navigation
            if (e.key === "ArrowDown") {
                currentFocus++;
                addActive(items);
                e.preventDefault();
            } else if (e.key === "ArrowUp") {
                currentFocus--;
                addActive(items);
                e.preventDefault();
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (items && currentFocus > -1 && items[currentFocus]) {
                    // Only click if not already-selected
                    if (!items[currentFocus].classList.contains("already-selected")) {
                        items[currentFocus].click();
                    }
                } else {
                    // No highlighted item: try exact match or create new free-text
                    handleCommaOrEnterBehavior(this.value, inp, arr, addTag, hiddenInput, selectedValues);
                }
            } else if (e.key === ",") {
                e.preventDefault();
                // Comma behaves like Enter selection but also can create free-text
                if (items && currentFocus > -1 && items[currentFocus]) {
                    if (!items[currentFocus].classList.contains("already-selected")) {
                        items[currentFocus].click();
                    }
                } else {
                    handleCommaOrEnterBehavior(this.value, inp, arr, addTag, hiddenInput, selectedValues);
                }
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

                    // store value in hidden input inside item
                    var hv = document.createElement("input");
                    hv.type = "hidden";
                    hv.value = item.value;
                    b.appendChild(hv);

                    if (isSelected) {
                        b.classList.add("already-selected");
                    } else {
                        // Explizites Entfernen der Stile für sauberen Neuaufbau
                        b.classList.remove("already-selected");

                        b.addEventListener("click", (function (it) {
                            return function (e) {
                                var v = it.value;
                                addTag(it.text, v, false);
                                inp.value = "";
                                hiddenInput.value = selectedValues.map(encodeValue).join(",");
                                // An dieser Stelle sollte closeAllLists aufgerufen werden
                                closeAllLists();
                                inp.focus();
                            };
                        })(item));
                    }

                    a.appendChild(b);
                }
            }
        }

        // ... handleCommaOrEnterBehavior, addActive, removeActive (unverändert) ...

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

    // ... autocompleteSingle, init, observer (unverändert) ...

    function autocompleteSingle(inp, arr, hiddenInput) {
        var currentFocus = -1;

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
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (currentFocus > -1 && x && x[currentFocus]) {
                    x[currentFocus].click();
                } else {
                    handleSingleCommaOrEnter(this.value, arr, inp, hiddenInput);
                }
            } else if (e.key === ",") {
                e.preventDefault();
                if (currentFocus > -1 && x && x[currentFocus]) {
                    x[currentFocus].click();
                } else {
                    handleSingleCommaOrEnter(this.value, arr, inp, hiddenInput);
                }
            }
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

    // Initialize on load and via MutationObserver
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