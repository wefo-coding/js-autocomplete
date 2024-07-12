/**
 * JavaScript Autocomplete.
 * 
 * Link:    https://github.com/wefo-coding/js-autocomplete
 * Author:  Florian Otten
 * Version: 0.1.0
 */

(function (global){
    
    function convert(select){
        
        // Make sure the select is a select element.
        if(
            !(select instanceof HTMLElement) || 
            select.tagName.toLowerCase() !== 'select' ||
            !select.classList.contains('autocomplete')
        ){
            return;
        }
        
        // Make sure the form has the autocomplete function switched off.
        var form = select.closest('form');
        if(form){
            form.setAttribute('autocomplete', 'off');
        }
        
        // options to array
        var options = Array.from(select.getElementsByTagName('option')).map(option => option.innerHTML);
        
        // create input
        var wrapper = global.document.createElement('div');
        wrapper.classList.add('autocomplete');
        select.parentNode.insertBefore(wrapper, select);
        var input = global.document.createElement('input');
        input.setAttribute('id', select.getAttribute('id'));
        input.setAttribute('name', select.getAttribute('name'));
        input.setAttribute('type', 'text');
        wrapper.appendChild(input);
        
        // delete select
        select.remove();
        
        autocomplete(input, options);
    }
    
    // This function was copied from W3schools https://www.w3schools.com/howto/howto_js_autocomplete.asp and modified by Temos International GmbH
    function autocomplete(inp, arr) {
        /*the autocomplete function takes two arguments, the text field element and an array of possible autocompleted values:*/
        var currentFocus;
        /*execute a function when someone writes in the text field:*/
        
        inp.addEventListener("input", function(e) {
            var a, b, i, val = this.value;
            /*close any already open lists of autocompleted values*/
            closeAllLists();
            if (!val) {
                return false;
            }
            currentFocus = -1;
            /*create a DIV element that will contain the items (values):*/
            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            /*append the DIV element as a child of the autocomplete container:*/
            this.parentNode.appendChild(a);
            
            var pos = -1;
            /*for each item in the array...*/
            for (i = 0; i < arr.length; i++) {
                pos = arr[i].toUpperCase().search(val.toUpperCase());
                /*check if the item contains the same letters as the text field value:*/
                if (pos >= 0) {
                    /*create a DIV element for each matching element:*/
                    b = document.createElement("DIV");
                    /*make the matching letters bold:*/
                    b.innerHTML = arr[i].substr(0, pos) + "<strong>" + arr[i].substr(pos, val.length) + "</strong>" + arr[i].substr(pos + val.length);
                    /*insert a input field that will hold the current array item's value:*/
                    b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                    /*execute a function when someone clicks on the item value (DIV element):*/
                    b.addEventListener("click", function(e) {
                        /*insert the value for the autocomplete text field:*/
                        inp.value = this.getElementsByTagName("input")[0].value;
                        /*close the list of autocompleted values, (or any other open lists of autocompleted values:*/
                        closeAllLists();
                    });
                    a.appendChild(b);
                }
            }
        });
        /*execute a function presses a key on the keyboard:*/
        inp.addEventListener("keydown", function(e) {
            var x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) {
                /*If the arrow DOWN key is pressed, increase the currentFocus variable:*/
                currentFocus++;
                /*and and make the current item more visible:*/
                addActive(x);
            } else if (e.keyCode == 38) { //up
                /*If the arrow UP key is pressed,
                decrease the currentFocus variable:*/
                currentFocus--;
                /*and and make the current item more visible:*/
                addActive(x);
            } else if (e.keyCode == 13) {
                /*If the ENTER key is pressed, prevent the form from being submitted,*/
                e.preventDefault();
                if (currentFocus > -1) {
                    /*and simulate a click on the "active" item:*/
                    if (x) x[currentFocus].click();
                }
            }
        });
        
        function addActive(x) {
            /*a function to classify an item as "active":*/
            if (!x) return false;
            /*start by removing the "active" class on all items:*/
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            /*add class "autocomplete-active":*/
            x[currentFocus].classList.add("autocomplete-active");
        }
        
        function removeActive(x) {
            /*a function to remove the "active" class from all autocomplete items:*/
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }
        
        function closeAllLists(elmnt) {
            /*close all autocomplete lists in the document, except the one passed as an argument:*/
            var x = document.getElementsByClassName("autocomplete-items");
            for (var i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != inp) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }
    
        /* Close lists when the user clicks in the document. */
        global.addEventListener('click', function(e){
            closeAllLists(e.target);
        });
    }
    
    /**
     * Initialization function
     */
    function init(){
        
        Array.from(global.document.getElementsByTagName('select')).forEach(function(select){
            if(select.classList.contains('autocomplete')){
                convert(select);
            }
        });
    }
    
    /* Call init function onload. */
    global.addEventListener('load', init);
    
}(window));