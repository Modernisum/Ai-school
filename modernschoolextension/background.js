chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "STUDENT_SUBMITTED") {
    console.log("✅ Student filled:", msg.student);

    // POST to backend
    fetch("http://localhost:5000/api/studentSubmit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "success", student: msg.student })
    })
      .then(res => res.json())
      .then(data => {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Submission Status",
          message: "Student submitted successfully!"
        });
      })
      .catch(err => {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Submission Failed",
          message: "Error: " + err.message
        });
      });
  }
});
