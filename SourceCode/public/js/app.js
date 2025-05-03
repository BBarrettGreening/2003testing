document.addEventListener("DOMContentLoaded", () => {
  const websiteStructuresElement = document.getElementById("website-structures-found");
  const latestScrapeDateElement = document.getElementById("latest-scrape-date");
  const theatresScrapedElement = document.createElement("p"); // Create an element for theatres scraped
  const downloadLink = document.getElementById("download-data");
  const statusMessage = document.getElementById("status-message");
  const cmdSidebar = document.querySelector(".cmd-sidebar");
  const toggleBtn = document.querySelector(".cmd-toggle-btn");

  latestScrapeDateElement.insertAdjacentElement("afterend", theatresScrapedElement);

  function updateStatus(message, isError = false) {
    statusMessage.style.display = "block";
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "red" : "black";
  }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function fetchLatestFile() {
    try {
      updateStatus("Fetching the latest file...");
      const response = await fetch("/getLatestFile");

      if (!response.ok) throw new Error("Failed to fetch the latest file.");

      const data = await response.json();

      if (data.latestFile && data.downloadUrl) {
        latestScrapeDateElement.textContent = `Latest Scrape: ${data.latestFile}`;

        updateStatus("Scraper on Standby...");

        // Debugging: Ensure correct download URL is set
        console.log("Download URL set to:", data.downloadUrl);

        // Ensure the correct download URL
        downloadLink.href = data.downloadUrl;
        downloadLink.setAttribute("download", "latest_scraped_data.zip");
        downloadLink.style.display = "inline-block";

        updateStatus("Successfully fetched data.");
      } else {
        latestScrapeDateElement.textContent = "No scrapes available.";
        downloadLink.style.display = "none";

        updateStatus("No scrapes available.", true);
      }
    } catch (error) {
      console.error("Error fetching latest file:", error);
      latestScrapeDateElement.textContent = "Error fetching latest scrape.";
      downloadLink.style.display = "none";

      updateStatus("Error fetching latest file.", true);
    }
  }

  document.getElementById("scan-layouts").addEventListener("click", async () => {
    try {
      updateStatus("Scanning website layouts...");

      const response = await fetch("/fetchStructure", { method: "POST" });

      if (!response.ok) throw new Error("Failed to scan website layouts.");

      const data = await response.json();
      updateStatus(data.message || "Website layouts scanned successfully.");

      await delay(2000); 
      await fetchLatestFile();
    } catch (error) {
      console.error("Error scanning layouts:", error);
      updateStatus("Error scanning layouts.", true);
    }
  });

  document.getElementById("scan-shows").addEventListener("click", async () => {
    try {
      updateStatus("Scanning show information...");
      const response = await fetch("/scrape");

      if (!response.ok) throw new Error("Failed to scan show information.");

      const data = await response.json();

      updateStatus(data.message || "Show information scanned successfully.");
      await delay(2000); // Wait 2 seconds to show the success message
      await fetchLatestFile(); // Refresh latest scrape data
    } catch (error) {
      console.error("Error scanning shows:", error);
      updateStatus("Error scanning shows.", true);
    }
  });

  // NEW: Handle scanning show website layouts
  document.getElementById("scan-shows-weblayouts").addEventListener("click", async () => {
    try {
      updateStatus("Scanning show website layouts...");
      const response = await fetch("/fetchShowStructure", { method: "POST" });

      if (!response.ok) throw new Error("Failed to scan show website layouts.");

      const data = await response.json();
      updateStatus(data.message || "Show website layouts scanned successfully.");

      await delay(2000); // Show success message briefly
      await fetchLatestFile(); // Then refresh latest scraped data
    } catch (error) {
      console.error("Error scanning show website layouts:", error);
      updateStatus("Error scanning show website layouts.", true);
    }
  });

  document.getElementById("export-failed-structures").addEventListener("click", async () => {
    try {
      const response = await fetch("/export-failed-structures");

      if (!response.ok) throw new Error("Failed to export failed structures.");

      // Trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "failedStructures.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      alert("Failed structures exported successfully.");
    } catch (error) {
      console.error("Error exporting failed structures:", error);
      alert("Error exporting failed structures.");
    }
  });

  // Show modal
  const showModal = document.getElementById("popup-modal");
  const addShowBtn = document.getElementById("add-show-button");
  const closeShowBtn = document.querySelector(".show-close");
  const saveShowBtn = document.getElementById("save-btn");
  const showFileInput = document.getElementById("show-file");
  const dropZoneShow = document.getElementById("drop-zone-show");

  // Theatre modal
  const theatreModal = document.getElementById("popup-modal-2");
  const addTheatreBtn = document.getElementById("add-theatre-button");
  const closeTheatreBtn = document.querySelector(".theatre-close");
  const saveTheatreBtn = document.getElementById("save-theatre-btn");
  const theatreFileInput = document.getElementById("theatre-file");
  const dropZoneTheatre = document.getElementById("drop-zone-theatre");

  // Open modals
  addShowBtn.addEventListener("click", () => {
    showModal.style.display = "flex";
    showFileInput.value = "";
  });

  addTheatreBtn.addEventListener("click", () => {
    theatreModal.style.display = "flex";
    theatreFileInput.value = "";
  });

  // Close modals
  closeShowBtn.addEventListener("click", () => showModal.style.display = "none");
  closeTheatreBtn.addEventListener("click", () => theatreModal.style.display = "none");

  // Close if clicked outside modal content
  window.addEventListener("click", (e) => {
    if (e.target === showModal) showModal.style.display = "none";
    if (e.target === theatreModal) theatreModal.style.display = "none";
  });

  // Setup drag-and-drop zones
  function setupDropZone(dropZone, fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");

      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        dropZone.textContent = e.dataTransfer.files[0].name;
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        dropZone.textContent = fileInput.files[0].name;
      }
    });
  }

  setupDropZone(dropZoneShow, showFileInput);
  setupDropZone(dropZoneTheatre, theatreFileInput);

  saveShowBtn.addEventListener("click", () => {
    const file = showFileInput.files[0];
    if (!file) {
      alert("Please upload a show file.");
      return;
    }

    const formData = new FormData();
    formData.append("ShowsListReport", file);

    fetch("/upload-show", {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Show file uploaded.");
        showModal.style.display = "none";
      })
      .catch(() => alert("Error uploading show file."));
  });

  saveTheatreBtn.addEventListener("click", () => {
    const file = theatreFileInput.files[0];
    if (!file) {
      alert("Please upload a theatre file.");
      return;
    }

    const formData = new FormData();
    formData.append("TheatreListReport", file);

    fetch("/upload-theatre", {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Theatre file uploaded.");
        theatreModal.style.display = "none";
      })
      .catch(() => alert("Error uploading theatre file."));
  });
  toggleBtn.addEventListener("click", () => {
    cmdSidebar.classList.toggle("collapsed");
    toggleBtn.textContent = cmdSidebar.classList.contains("collapsed") ? "Open Debug" : "Collapse";
  });

  // Initial fetch to populate the UI with the latest data
  fetchLatestFile();
});