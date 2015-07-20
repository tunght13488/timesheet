'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('previousVersion', details.previousVersion);
});

// chrome.browserAction.setBadgeText({text: 'SmartOSC'});

console.log('Timesheet - Event Page for Browser Action');

/*
 * Find provided URL to see if it's opened or not
 * If opened, focus on it
 * If not, create new tab with this URL
 */
function focusOrCreateTab(url) {
  chrome.windows.getAll({'populate': true}, function(windows) {
    var existingTab = null;
    windows.some(function (window) {
      return window.tabs.some(function (tab) {
        if (tab.url === url) {
          existingTab = tab;
          return true;
        }

        return false;
      });
    });

    if (existingTab) {
      chrome.tabs.update(existingTab.id, {'selected': true});
    } else {
      chrome.tabs.create({'url': url, 'selected': true});
    }
  });
}

/*
 * Fire this action upon clicking on extension icon
 */
chrome.browserAction.onClicked.addListener(function() {
  var reportUrl = chrome.extension.getURL('report.html');
  focusOrCreateTab(reportUrl);
});
