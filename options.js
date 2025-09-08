document.addEventListener("DOMContentLoaded", () => {
  console.log("Options page loaded successfully.")

  const createGroup = document.getElementById("createGroup")
  const groupName = document.getElementById("groupName")
  const groupExtensionsSelect = document.getElementById("groupExtensionsSelect")
  const setSchedule = document.getElementById("setSchedule")
  const scheduleExt = document.getElementById("scheduleExt")
  const scheduleTime = document.getElementById("scheduleTime")
  const scheduleEnable = document.getElementById("scheduleEnable")
  const addDomainRule = document.getElementById("addDomainRule")
  const domain = document.getElementById("domain")
  const domainExt = document.getElementById("domainExt")
  const permissionsList = document.getElementById("permissionsList")

  // Apply theme and font from localStorage
  const applyThemeAndFont = () => {
    const savedTheme = localStorage.getItem("theme") || "system"
    const savedFont = localStorage.getItem("font") || "default"
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
  applyThemeAndFont()

  // Populate extensions for group creation
  chrome.management.getAll((extensions) => {
    extensions
      .filter((ext) => ext.id !== chrome.runtime.id)
      .forEach((ext) => {
        const option = document.createElement("option")
        option.value = ext.id
        option.textContent = ext.name
        groupExtensionsSelect.appendChild(option)
      })

    // Permissions dashboard
    permissionsList.innerHTML = ""
    extensions.forEach((ext) => {
      chrome.management.getPermissionWarningsById(ext.id, (warnings) => {
        if (warnings.length > 0) {
          const div = document.createElement("div")
          div.className = "p-2 border rounded"
          div.innerHTML = `
            <p class="font-semibold">${ext.name}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">${warnings.join(
              ", "
            )}</p>
            <button class="disable-perm bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded mt-1" data-id="${
              ext.id
            }">Disable</button>
          `
          permissionsList.appendChild(div)
        }
      })
    })

    // Disable extension from permissions dashboard
    permissionsList.addEventListener("click", (e) => {
      if (e.target.classList.contains("disable-perm")) {
        const extId = e.target.dataset.id
        chrome.management.setEnabled(extId, false, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error disabling ${extId}:`, chrome.runtime.lastError)
          } else {
            alert(`Disabled extension with ID: ${extId}`)
          }
        })
      }
    })
  })

  // Create group
  createGroup.addEventListener("click", () => {
    const name = groupName.value.trim()
    const selectedExts = Array.from(groupExtensionsSelect.selectedOptions).map(
      (opt) => opt.value
    )
    if (name && selectedExts.length > 0) {
      chrome.storage.sync.get("groups", (data) => {
        const groups = data.groups || {}
        groups[name] = selectedExts
        chrome.storage.sync.set({ groups }, () => {
          alert(
            `Group "${name}" created with ${selectedExts.length} extensions.`
          )
          groupName.value = ""
          groupExtensionsSelect.selectedIndex = -1
        })
      })
    } else {
      alert("Please enter a group name and select at least one extension.")
    }
  })

  // Set schedule
  setSchedule.addEventListener("click", () => {
    const extId = scheduleExt.value.trim()
    const time = new Date(scheduleTime.value).getTime()
    const enabled = scheduleEnable.checked
    if (extId && time) {
      const delay = (time - Date.now()) / 60000
      if (delay < 0) {
        alert("Please select a future time.")
        return
      }
      chrome.alarms.create(`schedule_${extId}`, { delayInMinutes: delay })
      chrome.storage.sync.get("schedules", (data) => {
        const schedules = data.schedules || {}
        schedules[`schedule_${extId}`] = { extId, enabled }
        chrome.storage.sync.set({ schedules }, () => {
          alert(
            `Schedule set for extension ${extId} at ${new Date(
              time
            ).toLocaleString()}.`
          )
        })
      })
    } else {
      alert("Please enter an Extension ID and select a valid time.")
    }
  })

  // Add domain rule
  addDomainRule.addEventListener("click", () => {
    const dom = domain.value.trim()
    const extId = domainExt.value.trim()
    if (dom && extId) {
      chrome.storage.sync.get("domainRules", (data) => {
        const rules = data.domainRules || {}
        rules[dom] = rules[dom] || []
        if (!rules[dom].includes(extId)) {
          rules[dom].push(extId)
          chrome.storage.sync.set({ domainRules: rules }, () => {
            alert(`Domain rule added for ${dom}.`)
            domain.value = ""
            domainExt.value = ""
          })
        } else {
          alert("Extension already added for this domain.")
        }
      })
    } else {
      alert("Please enter a valid domain and Extension ID.")
    }
  })
})
