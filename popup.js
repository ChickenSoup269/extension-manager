document.addEventListener("DOMContentLoaded", () => {
  const extensionList = document.getElementById("extensionList")
  const groupList = document.getElementById("groupList")
  const themeSelect = document.getElementById("themeSelect")
  const fontSelect = document.getElementById("fontSelect")
  const searchInput = document.getElementById("searchInput")
  const openOptions = document.getElementById("openOptions")
  const aiInput = document.getElementById("aiInput")
  const recList = document.getElementById("recList")
  let extensionsData = []
  let groups = {}

  // Apply theme and font
  const applyThemeAndFont = () => {
    const savedTheme = localStorage.getItem("theme") || "system"
    const savedFont = localStorage.getItem("font") || "default"
    themeSelect.value = savedTheme
    fontSelect.value = savedFont

    if (savedTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
      document.body.classList.toggle("dark", prefersDark)
    } else {
      document.body.classList.toggle("dark", savedTheme === "dark")
    }

    document.body.classList.toggle("gohu", savedFont === "gohu")
  }

  themeSelect.addEventListener("change", () => {
    localStorage.setItem("theme", themeSelect.value)
    applyThemeAndFont()
  })

  fontSelect.addEventListener("change", () => {
    localStorage.setItem("font", fontSelect.value)
    applyThemeAndFont()
  })

  // Load groups from storage
  chrome.storage.sync.get("groups", (data) => {
    groups = data.groups || {}
    renderGroups()
  })

  // Render groups
  const renderGroups = () => {
    groupList.innerHTML = ""
    Object.keys(groups).forEach((groupName) => {
      const div = document.createElement("div")
      div.className =
        "glass-card group-item flex items-center justify-between p-2"
      div.innerHTML = `
        <p>${groupName}</p>
        <label class="switch">
          <input type="checkbox" data-group="${groupName}">
          <span class="slider"></span>
        </label>
      `
      div
        .querySelector("input")
        .addEventListener("change", (e) =>
          toggleGroup(groupName, e.target.checked)
        )
      groupList.appendChild(div)
    })
  }

  // Toggle group
  const toggleGroup = (groupName, enabled) => {
    groups[groupName].forEach((extId) => {
      chrome.management.setEnabled(extId, enabled, () => {
        if (chrome.runtime.lastError) {
          console.error(`Error toggling ${extId}:`, chrome.runtime.lastError)
        }
      })
    })
  }

  // Load and render extensions with drag and drop
  const renderExtensions = (extensions) => {
    extensionList.innerHTML = ""
    extensions
      .filter((ext) => ext.id !== chrome.runtime.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((ext) => {
        const div = document.createElement("div")
        div.className =
          "glass-card extension-item flex items-center justify-between p-3"
        div.draggable = true
        div.dataset.id = ext.id
        div.innerHTML = `
          <div class="flex items-center space-x-3">
            <img src="${ext.icons?.[0]?.url || "icon48.png"}" alt="${
          ext.name
        }" class="w-10 h-10 rounded-md">
            <div>
              <p class="font-semibold text-base">${ext.name}</p>
              <p class="text-xs text-gray-600 dark:text-gray-300 truncate w-64">${
                ext.description || "No description"
              }</p>
            </div>
          </div>
          <label class="switch">
            <input type="checkbox" ${ext.enabled ? "checked" : ""} data-id="${
          ext.id
        }">
            <span class="slider"></span>
          </label>
        `
        extensionList.appendChild(div)
      })

    // Drag and drop for sorting
    extensionList.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", e.target.dataset.id)
    })
    extensionList.addEventListener("dragover", (e) => e.preventDefault())
    extensionList.addEventListener("drop", (e) => {
      e.preventDefault()
      const id = e.dataTransfer.getData("text/plain")
      const dropTarget = e.target.closest(".extension-item")
      if (dropTarget && dropTarget.dataset.id !== id) {
        const fromExt = extensionsData.find((ext) => ext.id === id)
        const toExt = extensionsData.find(
          (ext) => ext.id === dropTarget.dataset.id
        )
        const fromIndex = extensionsData.indexOf(fromExt)
        const toIndex = extensionsData.indexOf(toExt)
        ;[extensionsData[fromIndex], extensionsData[toIndex]] = [
          extensionsData[fromIndex],
          extensionsData[toIndex],
        ]
        renderExtensions(extensionsData)
        chrome.storage.sync.set({ order: extensionsData.map((ext) => ext.id) })
      }
    })
  }

  // Load extensions
  chrome.management.getAll((extensions) => {
    extensionsData = extensions
    chrome.storage.sync.get("order", (data) => {
      if (data.order) {
        extensionsData.sort(
          (a, b) => data.order.indexOf(a.id) - data.order.indexOf(b.id)
        )
      }
      renderExtensions(extensionsData)
    })

    // Toggle individual extension
    extensionList.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        const extId = e.target.dataset.id
        const enabled = e.target.checked
        chrome.management.setEnabled(extId, enabled, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error toggling ${extId}:`, chrome.runtime.lastError)
            e.target.checked = !enabled
          } else {
            chrome.storage.sync.get("usage", (data) => {
              const usage = data.usage || {}
              usage[extId] = (usage[extId] || 0) + 1
              chrome.storage.sync.set({ usage })
            })
          }
        })
      }
    })

    // Search
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase()
      const filtered = extensionsData.filter(
        (ext) =>
          ext.name.toLowerCase().includes(query) ||
          (ext.description && ext.description.toLowerCase().includes(query))
      )
      renderExtensions(filtered)
    })
  })

  // Open options page with enhanced error handling
  openOptions.addEventListener("click", () => {
    console.log("Attempting to open options page...")
    console.log("Checking manifest.json options_ui:", {
      page: "options.html",
      open_in_tab: true,
    })
    try {
      chrome.runtime.openOptionsPage((result) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to open options page:",
            chrome.runtime.lastError.message
          )
          alert(
            'Error: Could not open Advanced Settings. Ensure options.html exists in the extension directory, is named exactly "options.html", and reload the extension in chrome://extensions/.'
          )
        } else {
          console.log("Options page opened successfully.")
        }
      })
    } catch (error) {
      console.error("Exception when opening options page:", error)
      alert(
        "Critical error opening Advanced Settings. Check Console for details, verify options.html exists, and ensure the extension is properly loaded."
      )
    }
  })

  // AI Chat (simple mock)
  aiInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const command = aiInput.value.toLowerCase()
      if (command.includes("disable")) {
        const extName = command.split("disable ")[1]
        const ext = extensionsData.find((e) =>
          e.name.toLowerCase().includes(extName)
        )
        if (ext) {
          chrome.management.setEnabled(ext.id, false)
          alert(`Disabled ${ext.name}`)
        } else {
          alert("Extension not found.")
        }
      }
      aiInput.value = ""
    }
  })

  // Recommendations
  chrome.storage.sync.get("usage", (data) => {
    const usage = data.usage || {}
    const topUsed = Object.keys(usage).sort((a, b) => usage[b] - usage[a])[0]
    if (topUsed) {
      recList.innerHTML = `<li>Based on your usage of ${
        extensionsData.find((e) => e.id === topUsed)?.name || "unknown"
      }, try "Similar Extension" from Chrome Web Store.</li>`
    }
  })

  applyThemeAndFont()
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (localStorage.getItem("theme") === "system") {
        applyThemeAndFont()
      }
    })
})
