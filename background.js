chrome.alarms.onAlarm.addListener((alarm) => {
  chrome.storage.sync.get("schedules", (data) => {
    const schedules = data.schedules || {}
    if (schedules[alarm.name]) {
      const { extId, enabled } = schedules[alarm.name]
      chrome.management.setEnabled(extId, enabled, () => {
        if (chrome.runtime.lastError) {
          console.error("Error in alarm:", chrome.runtime.lastError)
        }
      })
    }
  })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    chrome.storage.sync.get("domainRules", (data) => {
      const rules = data.domainRules || {}
      const hostname = new URL(changeInfo.url).hostname
      if (rules[hostname]) {
        rules[hostname].forEach((extId) => {
          chrome.management.setEnabled(extId, true, () => {
            if (chrome.runtime.lastError) {
              console.error(
                `Error enabling ${extId} for ${hostname}:`,
                chrome.runtime.lastError
              )
            }
          })
        })
      }
    })
  }
})

setInterval(() => {
  chrome.management.getAll((extensions) => {
    extensions.forEach((ext) => {
      chrome.management.getPermissionWarningsById(ext.id, (warnings) => {
        if (warnings.length > 0) {
          chrome.notifications.create({
            title: "Permission Alert",
            message: `${ext.name} has sensitive permissions: ${warnings.join(
              ", "
            )}`,
            type: "basic",
            iconUrl: "icon48.png",
          })
        }
      })
    })
  })
}, 60000)

chrome.alarms.create("cleanupCheck", { periodInMinutes: 1440 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanupCheck") {
    chrome.storage.sync.get("usage", (data) => {
      const usage = data.usage || {}
      chrome.management.getAll((extensions) => {
        Object.keys(usage).forEach((extId) => {
          if (usage[extId] < 1) {
            const extName =
              extensions.find((e) => e.id === extId)?.name || extId
            chrome.notifications.create({
              title: "Cleanup Suggestion",
              message: `Consider disabling unused extension: ${extName}`,
              type: "basic",
              iconUrl: "icon48.png",
            })
          }
        })
      })
    })
  }
})
