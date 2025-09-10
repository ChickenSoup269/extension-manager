document.addEventListener("DOMContentLoaded", () => {
  const extensionList = document.getElementById("extensionList")
  const themeToggle = document.getElementById("themeToggle")

  // Load theme from storage or system preference
  const applyTheme = () => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.body.classList.add("dark")
      themeToggle.textContent = "☀️"
    } else {
      document.body.classList.remove("dark")
      themeToggle.textContent = "🌙"
    }
  }

  // Toggle theme
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark")
    const isDark = document.body.classList.contains("dark")
    localStorage.setItem("theme", isDark ? "dark" : "light")
    themeToggle.textContent = isDark ? "☀️" : "🌙"
  })

  // Load extensions
  chrome.management.getAll((extensions) => {
    extensions
      .filter((ext) => ext.id !== chrome.runtime.id) // Exclude this extension
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((ext) => {
        const div = document.createElement("div")
        div.className =
          "extension-item flex items-center justify-between p-2 border rounded"
        div.innerHTML = `
          <div class="flex items-center space-x-2">
            <img src="${ext.icons?.[0]?.url || "icon48.png"}" alt="${
          ext.name
        }" class="w-8 h-8">
            <div>
              <p class="font-medium">${ext.name}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">${
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

    // Add toggle functionality
    extensionList.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        const extId = e.target.dataset.id
        const enabled = e.target.checked
        chrome.management.setEnabled(extId, enabled, () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError)
            e.target.checked = !enabled // Revert on error
          }
        })
      }
    })
  })

  // Apply initial theme
  applyTheme()

  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", applyTheme)
})
