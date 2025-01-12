let selectedLanguages = undefined;

async function saveSelectedLanguages() {
  await chrome.storage.local.set({"selectedLanguages": selectedLanguages});
}

async function main() {
  const storage = await chrome.storage.local.get();
  if (Object.keys(storage).length === 0) {
    selectedLanguages = [];
  }
  else {
    selectedLanguages = storage.selectedLanguages;
  }

  fillOptions();
  fillSelectedLanguages();
  
  const addLanguageButton = document.getElementById("addLanguage");
  if (addLanguageButton) {
    addLanguageButton.addEventListener("click", addLanguage);
  }
  
}

function fillOptions() {
  const select = document.getElementById("addLanguageSelect");
  
  select.innerHTML = "";
  languages.forEach((language) => {
    if (selectedLanguages.includes(language)) {
      return;
    }
    const option = document.createElement("option");
    option.value = language;
    option.textContent = language;
    select.appendChild(option);
  });
}

function fillSelectedLanguages() {
  const selectedLanguagesList = document.getElementById("selectedLanguages");
  if (!selectedLanguagesList) {
    return;
  }
  
  selectedLanguagesList.innerHTML = "";
  selectedLanguages.forEach((language,i) => {
    const li = document.createElement("li");
    li.setAttribute("data-index", i);
    li.textContent = language;

    const upButton = document.createElement("button");
    upButton.textContent = "↑";
    if (i === 0) {
      upButton.disabled = true;
    }
    upButton.addEventListener("click", moveLanguageUp);
    li.appendChild(upButton);

    const downButton = document.createElement("button");
    downButton.textContent = "↓";
    if (i === selectedLanguages.length - 1) {
      downButton.disabled = true;
    }
    downButton.addEventListener("click", moveLanguageDown);
    li.appendChild(downButton);
    selectedLanguagesList.appendChild(li);
  });
}

function moveLanguageUp(e) {
  e.preventDefault();
  const target = e.target;
  if (!target || target.parentElement.tagName !== "LI") {
    return;
  }

  const index = parseInt(target.parentElement.getAttribute("data-index"));
  if (index === 0) {
    return;
  }

  const language = selectedLanguages.splice(index, 1)[0];
  selectedLanguages.splice(index - 1, 0, language);
  console.debug(selectedLanguages);
  fillSelectedLanguages();
  saveSelectedLanguages();
}

function moveLanguageDown(e) {
  e.preventDefault();
  const target = e.target;
  if (!target || target.parentElement.tagName !== "LI") {
    return;
  }

  const index = parseInt(target.parentElement.getAttribute("data-index"));
  if (index === selectedLanguages.length - 1) {
    return;
  }

  const language = selectedLanguages.splice(index, 1)[0];
  selectedLanguages.splice(index + 1, 0, language);
  console.debug(selectedLanguages);
  fillSelectedLanguages();
  saveSelectedLanguages();
}

function addLanguage(e) {
  e.preventDefault();
  const select = document.querySelector("select#addLanguageSelect");
  const selectedLanguagesList = document.getElementById("selectedLanguages");
  if (!select || !selectedLanguagesList) {
    console.log("select or selectedLanguagesList not found");
    return;
  }
  
  const selectedLanguage = select.value;
  console.log(selectedLanguage);

  if (!selectedLanguage) {
    console.log("No language selected");
    return;
  }

  if (selectedLanguages.includes(selectedLanguage)) {
    console.log("Language already selected");
    return;
  }

  selectedLanguages.push(selectedLanguage);
  
  fillOptions();
  fillSelectedLanguages();
  saveSelectedLanguages();
}

main();