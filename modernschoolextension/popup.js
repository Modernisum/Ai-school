let students = [];

// Handle Excel Upload
document.getElementById("excelFile").addEventListener("change", handleFile);

function handleFile(e) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    students = XLSX.utils.sheet_to_json(firstSheet);
    alert("Excel loaded. Found " + students.length + " students.");
  };
  reader.readAsArrayBuffer(e.target.files[0]);
}

// Show preview when index is typed
document.getElementById("studentIndex").addEventListener("input", () => {
  const idx = parseInt(document.getElementById("studentIndex").value) - 1;
  if (students[idx]) {
    const s = students[idx];
    document.getElementById("studentPreview").style.display = "block";
    document.getElementById("previewName").innerText = s.Name || "";
    document.getElementById("previewFather").innerText = s.FatherName || "";
    document.getElementById("previewDOB").innerText = s.DOB || "";
    document.getElementById("previewAddress").innerText = s.Address || "";
    document.getElementById("studentPhoto").src = s.PhotoURL || "";

    // Update download button
    const btn = document.getElementById("downloadPhotoBtn");
    if (btn) {  
      btn.style.display = s.PhotoURL ? "block" : "none";
      btn.onclick = () => downloadImage(s.PhotoURL);
    }
  } else {
    document.getElementById("studentPreview").style.display = "none";
  }
});

// Autofill button → send selected student to content/injected
document.getElementById("autofillBtn").addEventListener("click", () => {
  const index = parseInt(document.getElementById("studentIndex").value) - 1;
  if (index < 0 || index >= students.length) {
    alert("Invalid index");
    return;
  }
  const student = students[index];

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        files: ["injected.js"],
      },
      () => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "AUTOFILL", student });
      }
    );
  });
});

// Helper: download image from URL
function downloadImage(url) {
  if (!url) return alert("No image URL available");
  const a = document.createElement("a");
  a.href = url;
  a.download = "student_photo.webp"; // default file name
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
