(function () {
  window.addEventListener("message", async (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;
    if (!event.data.__autofill__) return;

    const student = event.data.student;

    try {
      // Fill text fields (update selectors according to actual form)
      const nameEl = document.querySelector("input[name='Name']");
      if (nameEl) nameEl.value = student.Name || "";

      const fatherEl = document.querySelector("input[name='FatherName']");
      if (fatherEl) fatherEl.value = student.FatherName || "";

      const dobEl = document.querySelector("input[name='DOB']");
      if (dobEl) {
        // Convert dd-mm-yyyy to yyyy-mm-dd if needed
        let dob = student.DOB || "";
        const match = dob.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (match) dob = `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`;
        dobEl.value = dob;
      }

      const addressEl = document.querySelector("textarea[name='Address']");
      if (addressEl) addressEl.value = student.Address || "";

      // Handle image preview (cannot always set file input programmatically)
      if (student.PhotoURL) {
        let imgPreview = document.querySelector("#profileImagePreview");
        if (!imgPreview) {
          imgPreview = document.createElement("img");
          imgPreview.id = "profileImagePreview";
          imgPreview.style.maxWidth = "150px";
          imgPreview.style.display = "block";
          const fileInput = document.querySelector("input[type='file'][name='Photo']");
          if (fileInput) fileInput.insertAdjacentElement("afterend", imgPreview);
        }
        imgPreview.src = student.PhotoURL;
      }

      // Send success feedback
      window.postMessage({ __studentFilled__: true, student }, "*");

    } catch (err) {
      console.error("Autofill failed", err);
    }
  });
})();
