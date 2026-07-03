# JS-Autocomplete (v2.2.0)

A lightweight, dependency-free JavaScript library that transforms standard HTML `<select>` elements into modern, user-friendly autocomplete fields. Supports single-select, multi-select (tags), and custom free-text entries.

## Features

- 🚀 **Zero Dependencies**: Pure Vanilla JavaScript.
- 📋 **Single & Multi-Select**: Works with both standard and `multiple` select elements.
- 🏷️ **Tag System**: Interactive tag creation and removal in multi-select mode.
- ⌨️ **Keyboard Navigation**: Full support for arrow keys, `Enter`, and `Tab`.
- ➕ **Free-text Support**: Optionally allow users to enter values not present in the predefined list.
- 🛠️ **Custom Separators**: Define specific keys (e.g., comma, semicolon) to quickly commit a tag.
- 🔄 **Auto-Initialization**: Uses `MutationObserver` to automatically detect and initialize new select elements added to the DOM.

## Installation

Simply include `autocomplete.js` in your project and add the required CSS styles.

```html
<script src="js/autocomplete.js"></script>
```

## Usage

### Multi-Select with Free-text & Separators

For a tag-based input that allows custom entries, use `multiple`, `data-allow-new`, and `data-separator`.

```html
<select class="autocomplete" multiple data-allow-new data-separator=",;">
  <option value="med">Medical</option>
  <option value="den">Dental</option>
</select>
```

Depending on your backend requirements, you can control how the selected values are submitted in the HTML form:

### 1. Default Mode (Without data-native-array)
The script removes the original select element and creates a single hidden input element. Multiple selections are joined into a single comma-separated string.
- Submitted Form Data: UserIds=3,5
- Best used for: Traditional Node.js, PHP backends, or custom frontend scripts that parse comma-separated strings manually.

### 2. Native Array Mode (With data-native-array)
The script keeps the original select multiple active in the DOM but hides it visually. Selected tags directly manipulate the selected property of the hidden native options.
- Submitted Form Data: UserIds=3&UserIds=5
- Best used for: ASP.NET Core Model Binding, AJAX form loaders (like TemosLoader utilizing URLSearchParams), or any framework relying on HTTP standard multi-value queries.

---

## Data Attributes

| Attribute        | Description                                                 |
|------------------|-------------------------------------------------------------|
| `multiple`       | Enables multi-select mode (tag system).                     |
| `data-allow-new` | Adds an "Add New: …" option to the list for custom entries.|
| `data-separator` | Keys that trigger tag creation (e.g. `,;`).                 |

## CSS Styling (Base Requirements)

The included autocomplete.css provides only the minimal functional requirements (positioning, basic visibility, and keyboard focus states). It is designed to be lightweight so you can easily override the styles to match your own UI design.

## Precision Logic

When Enter, Tab, or a separator key is pressed, the script follows this priority:

1. **Manual Selection**: If you used arrow keys to highlight a specific item, that item is chosen.
2. **Exact Match**: If your typed text exactly matches a suggestion, the suggestion is chosen.
3. **Free-text**: If neither applies and `data-allow-new` is active, your typed text is added as a new entry.
