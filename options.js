const selectedLanguages = JSON.parse(localStorage.getItem("preferedLanguages")) || [];

function main() {
  
}

function fillOptions() {
  const select = document.getElementById("addLanguage");
  
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
  
  selectedLanguages.forEach((language) => {
    const li = document.createElement("li");
    li.textContent = language;
    selectedLanguagesList.appendChild(li);
  });
}

function addLanguage() {
  const select = document.querySelector("select#addLanguage");
  const selectedLanguagesList = document.getElementById("selectedLanguages");
  if (!select || !selectedLanguagesList) {
    return;
  }
  
  const selectedLanguage = select.value;
  
  if (selectedLanguage && !selectedLanguages.includes(selectedLanguage)) {
    selectedLanguages.push(selectedLanguage);
    localStorage.setItem("selectedLanguages", JSON.stringify(selectedLanguages));
    
    const li = document.createElement("li");
    li.textContent = selectedLanguage;
    selectedLanguagesList.appendChild(li);
    
    select.value = "";
  }
}

main();