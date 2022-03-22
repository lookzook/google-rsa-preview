// Returns an array of arrays of possibilities. [[1,2,3,4], [1,2,4,3], ...]
function combinerR(all_elements = [], combo_length) {
  if (combo_length <= 1) {
    // No permutation needed. The combination length must be 1
    return all_elements.map(element => [element]);
  }

  if (combo_length > all_elements.length) {
    throw new Error('Combo length cannot be longer than the total elements provided');
  }

  if (all_elements.length === 1) {
    return [all_elements];
  }

  // Shallow copy the array to prevent modifications from propagating
  const combinations = [];
  for (let i = 0; i < all_elements.length; i++) {
    // Each element will get its chance to be the "first" in the array
    const element_in_use = all_elements[i];
    const other_elements = [...all_elements];
    other_elements.splice(i, 1);

    // Recursively call combinerR again, so all the inner elements get a chance to be "second"
    const inner_combinations = combinerR(other_elements, combo_length - 1);
    // Add the item we've held on to above, and put it first in the arrays returned
    for (let inner_combo of inner_combinations) {
      inner_combo.unshift(element_in_use);
      combinations.push(inner_combo);
    }
  }

  return combinations;
}

function getRsaCombinations(headline_objects, description_objects) {
  const headline_indexes = [...headline_objects.keys()];
  const description_indexes = [...description_objects.keys()];

  // Store the headlines that should be pinned to specific area
  const headline_pins = [[], [], []];
  const headlines_banned_positions = [[], [], []];
  for (let i = 0; i < headline_objects.length; i++) {
    const headline_obj = headline_objects[i];
    // If a headline is pinned, it cannot be in any other spot
    if (headline_obj.pin_to === 1) {
      headline_pins[0].push(i);
      headlines_banned_positions[1].push(i);
      headlines_banned_positions[2].push(i);
      continue;
    }

    if (headline_obj.pin_to === 2) {
      headline_pins[1].push(i);
      headlines_banned_positions[0].push(i);
      headlines_banned_positions[2].push(i);
      continue;
    }

    if (headline_obj.pin_to === 3) {
      headline_pins[2].push(i);
      headlines_banned_positions[0].push(i);
      headlines_banned_positions[1].push(i);
      continue;
    }
  }

  // Combine the headlines
  const headline_idx_combos = combinerR(headline_indexes, 3);

  // Weed out the ones that dont contain a headline in the right "Pinned" position
  for (let i = 0; i < headline_pins.length; i++) {
    const must_contain = headline_pins[i];
    if (must_contain.length <= 0) {
      // No headlines were pinned for this spot
      continue;
    }

    // Loop through backwards so removing an array element doesn't cause us to go out of bounds
    for (let combo_idx = headline_idx_combos.length - 1; combo_idx >= 0; combo_idx--) {
      const combo = headline_idx_combos[combo_idx];
      // This particular combination does not contain a headline that was pinned to this spot
      if (!must_contain.includes(combo[i])) {
        headline_idx_combos.splice(combo_idx, 1);
      }
    }
  }

  // Weed out the ones that contain a headline in a banned position
  for (let i = 0; i < headlines_banned_positions.length; i++) {
    const must_not_contain = headlines_banned_positions[i];
    if (must_not_contain.length <= 0) {
      // No headlines were pinned for this spot
      continue;
    }

    // Loop through backwards so removing an array element doesn't cause us to go out of bounds
    for (let combo_idx = headline_idx_combos.length - 1; combo_idx >= 0; combo_idx--) {
      const combo = headline_idx_combos[combo_idx];
      // This particular combination does not contain a headline that was pinned to this spot
      if (must_not_contain.includes(combo[i])) {
        headline_idx_combos.splice(combo_idx, 1);
      }
    }
  }

  // Turn the index combinations back into headline strings combined by a " | "
  const headline_strings = headline_idx_combos.map(indexes => {
    const headlines = [];
    for (const index of indexes) {
      headlines.push(headline_objects[index].text);
    }

    return headlines.join(' | ')
  });
  return headline_strings;
}

/**
 * @param {string} id_prefix - "headline" or "description"
 * @param {number} total - Total number of these inputs to scan for
 */
function getHeadlineDescriptionObjs(id_prefix, total) {
  const objs = [];
  for (let i = 0; i < total; i++) {
    const text_input = document.querySelector(`#${id_prefix}_${i + 1}`);
    const pin_input = document.querySelector(`#${id_prefix}_${i + 1}_pin`);
    if (!text_input || !pin_input) {
      continue;
    }

    const text = text_input.value.trim();
    if (text.length === 0) {
      continue;
    }

    let pin_to = parseInt(pin_input.value, 10);
    if (isNaN(pin_to) || pin_to <= 0 || pin_to > 3) {
      pin_to = null;
    }

    objs.push({
      text,
      pin_to,
    });
  }

  return objs;
}

function fillInputsFromObjArray(id_prefix, objs) {
  for (let i = 0; i < objs.length; i++) {
    const text_input = document.querySelector(`#${id_prefix}_${i + 1}`);
    const pin_input = document.querySelector(`#${id_prefix}_${i + 1}_pin`);
    if (!text_input || !pin_input) {
      return;
    }

    const obj = objs[i];
    if (obj.text.length > 0) {
      text_input.value = obj.text;
    }

    if (obj.pin_to > 0 && obj.pin_to <= 3) {
      pin_input.value = obj.pin_to;
    } else {
      pin_input.value = -1;
    }
  }
}

function buildPreviewFromForm() {
  // Clear the previous results
  const results_container = document.querySelector('#results_container');
  while (results_container.firstChild) {
    results_container.removeChild(results_container.firstChild);
  }

  const headline_objs = getHeadlineDescriptionObjs('headline', 15);
  const description_objs = getHeadlineDescriptionObjs('description', 4);

  const combos = getRsaCombinations(headline_objs, description_objs);
  const result_template = document.querySelector('#result_template');
  for (const combo of combos) {
    // Clone the new row and insert it into the table
    const result_row = result_template.content.cloneNode(true);
    const headline_element = result_row.querySelector('.c-result-headline');

    // TODO: Return more than just the headline combinations
    headline_element.textContent = combo;
    results_container.appendChild(headline_element);
  }
}

function saveForm() {
  const headline_objs = getHeadlineDescriptionObjs('headline', 15);
  const description_objs = getHeadlineDescriptionObjs('description', 4);

  const save_file = {
    headline_objs,
    description_objs,
  };
  localStorage.setItem('save_file', JSON.stringify(save_file));
}

function loadForm() {
  resetForm();

  const save_file_json = localStorage.getItem('save_file');
  if (!save_file_json) {
    return;
  }

  let save_file = {};
  try {
    save_file = JSON.parse(save_file_json);
  } catch (e) {
    return;
  }

  fillInputsFromObjArray('headline', save_file.headline_objs);
  fillInputsFromObjArray('description', save_file.description_objs);
}

function resetForm() {
  [...document.querySelectorAll('input[type=text]')].forEach(input => input.value = '');
  [...document.querySelectorAll('select')].forEach(select => select.value = -1);
}

const rsa_form = document.querySelector('#rsa_form');
rsa_form.addEventListener('submit', (e) => {
  buildPreviewFromForm();
  e.preventDefault();
});

const save_button = document.querySelector('#save');
save_button.addEventListener('click', () => saveForm());

const load_button = document.querySelector('#load');
load_button.addEventListener('click', () => loadForm());

const reset_button = document.querySelector('#reset');
reset_button.addEventListener('click', () => resetForm());



// const combos = getRsaCombinations([
//   {headline: 'Backed By a 5-Year Warranty', pin_to: null},
//   {headline: 'Durable And Scratch Resistant', pin_to: null},
//   {headline: 'Slip Resistant Epoxy Flooring', pin_to: 1},
//   {headline: 'Professional Epoxy Flooring', pin_to: 1},
// //  {headline: 'Commercial and Industrial', pin_to: null},
//   {headline: 'Beautiful and Long Lasting', pin_to: null},
//   {headline: 'Prevent Slips, Trips and Falls', pin_to: null},
//   {headline: 'Over 1 Million sq feet coated', pin_to: null},
//   {headline: '2500+ happy customers', pin_to: null},
//   {headline: 'Speak to a flooring expert now', pin_to: null},
//   {headline: 'Industrial-grade Epoxy Floors', pin_to: 1},
//   {headline: 'Commercial-grade Epoxy Floors', pin_to: 1},
//   {headline: 'Epoxy Flooring Specialists', pin_to: 1},
//   {headline: 'Speak to an expert today', pin_to: null},
//   {headline: 'Protect your floor and workers', pin_to: null},
// ], []);
// console.log(combos);
