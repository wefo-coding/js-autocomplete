/**
 * JavaScript Autocomplete.
 * 
 * Link:    https://github.com/wefo-coding/js-autocomplete
 * Author:  Florian Otten / Modified by Temos International GmbH
 * Version: 1.0.0
 */

(function (global) {

    function convert(select) {

        // Make sure the select is a select element.
        if (
            !(select instanceof HTMLElement) ||
            select.tagName.toLowerCase() !== 'select' ||
            !select.classList.contains('autocomplete')
        ) {
            return;
        }

        // Disable native autocomplete on parent form
        var form = select.closest('form');
        if (form) {
            form.setAttribute('autocomplete', 'off');
        }

        // Map options -> [{ text, value }]
        var options = Array.from(select.getElementsByTagName('option')).map(option => ({
            text: option.textContent,
            value: option.value
        }));

        // Create wrapper + input
        var wrapper = global.document.createElement('div');
        wrapper.classList.add('autocomplete');
        select.parentNode.insertBefore(wrapper, select);

        var input = global.document.createElement(
            select.classList.contains('textarea') ? 'textarea' : 'input'
        );
        input.setAttribute('id', select.getAttribute('id'));
        input.setAttribute('type', 'text');
        input.setAttribute('autocomplete', 'off');
        wrapper.appendChild(input);

        // Hidden field (for actual form value)
        var hidden = global.document.createElement('input');
        hidden.setAttribute('type', 'hidden');
        hidden.setAttribute('name', select.getAttribute('name'));
        wrapper.appendChild(hidden);

        // Selected option -> prefill input + hidden
        var selectedOption = Array.from(select.options).find(o => o.selected && o.value.trim() !== "");
        if(selectedOption){
            input.value = selectedOption.textContent;
            hidden.value = selectedOption.value;
        } else {
            input.value = "";
            hidden.value = "";
        }


        // Remove original select
        select.remove();

        // Init autocomplete behavior
        autocomplete(input, options, hidden);
    }

    // Autocomplete logic
    function autocomplete(inp, arr, hiddenInput) {
        var currentFocus;

        inp.addEventListener("input", function (e) {
            var a, b, i, val = this.value;

            // Hidden-Value standardmäßig gleich Text
            hiddenInput.value = val;

            closeAllLists();
            if (!val) {
                return false;
            }
            currentFocus = -1;

            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            this.parentNode.appendChild(a);

            for (i = 0; i < arr.length; i++) {
                if (arr[i].text.toUpperCase().indexOf(val.toUpperCase()) >= 0) {
                    b = document.createElement("DIV");
                    var pos = arr[i].text.toUpperCase().indexOf(val.toUpperCase());
                    b.innerHTML = arr[i].text.substr(0, pos) + "<strong>" + arr[i].text.substr(pos, val.length) + "</strong>" + arr[i].text.substr(pos + val.length);
                    b.innerHTML += "<input type='hidden' value='" + arr[i].text + "'>";
                    b.addEventListener("click", function (e) {
                        const itemText = this.getElementsByTagName("input")[0].value;
                        const selected = arr.find(opt => opt.text === itemText);
                        inp.value = selected.text;             // Sichtbarer Text
                        hiddenInput.value = selected.value;     // Value der Option
                        closeAllLists();
                    });
                    a.appendChild(b);
                }
            }
        });

        inp.addEventListener("keydown", function (e) {
            var x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) { // Pfeil runter
                currentFocus++;
                addActive(x);
            } else if (e.keyCode == 38) { // Pfeil hoch
                currentFocus--;
                addActive(x);
            } else if (e.keyCode == 13) { // Enter
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                }
            }
        });

        function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add("autocomplete-active");
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
        }

        global.addEventListener('click', function (e) {
            closeAllLists(e.target);
        });
    }

    // Init auf Seitenladevorgang
    function init() {
        Array.from(global.document.getElementsByTagName('select')).forEach(function (select) {
            if (select.classList.contains('autocomplete')) {
                convert(select);
            }
        });
    }

    global.addEventListener('load', init);

    // MutationObserver für dynamisch hinzugefügte selects
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node !== null && node instanceof HTMLElement) {
                    if (node.tagName === 'SELECT') {
                        convert(node);
                    }
                    else {
                        Array.from(node.getElementsByTagName('select')).forEach(function (select) {
                            if (select.classList.contains('autocomplete')) {
                                convert(select);
                            }
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
