// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph

'use strict';
importScripts('settings.js');

// CHANGED: Get version using the modern API.
const version = chrome.runtime.getManifest().version;

let cloakedTabs = [];
let uncloakedTabs = [];
let contextLoaded = false;

function extractDomainFromURL(url) {
    if (!url) return "";
    if (url.indexOf("://") != -1) url = url.substr(url.indexOf("://") + 3);
    if (url.indexOf("/") != -1) url = url.substr(0, url.indexOf("/"));
    if (url.indexOf("@") != -1) url = url.substr(url.indexOf("@") + 1);
    if (url.match(/^(?:\[[A-Fa-f0-9:.]+\])(:[0-9]+)?$/g)) {
        if (url.indexOf("]:") != -1) return url.substr(0, url.indexOf("]:") + 1);
        return url;
    }
    if (url.indexOf(":") > 0) url = url.substr(0, url.indexOf(":"));
    return url;
}

function in_array(needle, haystack) {
    if (!haystack || !needle) return false;
    if (binarySearch(haystack, needle) != -1) return '1';
    if (needle.indexOf('www.') == 0) {
        if (binarySearch(haystack, needle.substring(4)) != -1) return '1';
    }
    for (var i in haystack) {
        if (haystack[i].indexOf("*") == -1 && haystack[i].indexOf("?") == -1) continue;
        if (new RegExp('^(?:www\\.|^)(?:' + haystack[i].replace(/\./g, '\\.').replace(/^\[/, '\\[').replace(/\]$/, '\\]').replace(/\?/g, '.').replace(/\*/g, '[^.]+') + ')').test(needle)) return '1';
    }
    return false;
}

function binarySearch(list, item) {
    var min = 0;
    var max = list.length - 1;
    var guess;
    var bitwise = (max <= 2147483647) ? true : false;
    if (bitwise) {
        while (min <= max) {
            guess = (min + max) >> 1;
            if (list[guess] === item) { return guess; }
            else {
                if (list[guess] < item) { min = guess + 1; }
                else { max = guess - 1; }
            }
        }
    } else {
        while (min <= max) {
            guess = Math.floor((min + max) / 2);
            if (list[guess] === item) { return guess; }
            else {
                if (list[guess] < item) { min = guess + 1; }
                else { max = guess - 1; }
            }
        }
    }
    return -1;
}
// CHANGED: Function now async, fetches settings from storage.
async function enabled(tab, dpcloakindex) {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    const dpdomaincheck = await domainCheck(extractDomainFromURL(tab.url));
    dpcloakindex = dpcloakindex || cloakedTabs.indexOf(tab.windowId + "|" + tab.id);

    if ((settings.enable || dpdomaincheck === '1') && dpdomaincheck !== '0' && (settings.global || (!settings.global && (dpcloakindex !== -1 || settings.newPages === "Cloak" || dpdomaincheck === '1')))) {
        return true;
    }
    return false;
}

// CHANGED: Function now async to get lists from storage.
async function domainCheck(domain) {
    if (!domain) return '-1';
    const { whiteList, blackList } = await chrome.storage.local.get(["whiteList", "blackList"]);

    // Sort lists for binary search, as they are no longer presorted in a global var.
    whiteList.sort();
    blackList.sort();

    if (in_array(domain, whiteList)) return '0';
    if (in_array(domain, blackList)) return '1';
    return '-1';
}

// CHANGED: Now handles saving lists to chrome.storage.
async function domainHandler(domain, action) {
    let { whiteList, blackList } = await chrome.storage.local.get({ whiteList: [], blackList: [] });

    // Remove domain from both lists first
    whiteList = whiteList.filter(item => item !== domain);
    blackList = blackList.filter(item => item !== domain);

    switch (action) {
        case 0: // Whitelist
            whiteList.push(domain);
            break;
        case 1: // Blacklist
            blackList.push(domain);
            break;
        case 2: // Remove
            break;
    }

    await chrome.storage.local.set({ whiteList, blackList });
}

// CHANGED: Applies styles by fetching current settings. Now fully async.
async function magician(shouldEnable, tabId) {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

    if (shouldEnable) {
        chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: true },
            files: ["js/jquery.js", "js/keypress-2.1.4.min.js", "js/dp.js"],
        }).then(() => {
            chrome.scripting.executeScript({
                target: { tabId: tabId, allFrames: true },
                func: (allSettings) => {
                    window.dpSettings = allSettings;
                    runDP();
                },
                args: [settings]
            });
        }).catch(err => console.log(`注入脚本失败: ${err}`));
    } else {
        chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: true },
            func: () => {
                if (typeof removeCss === 'function') {
                    removeCss();
                }
            },
        });
    }

    // UPDATED: Replaced `pageAction` with `action` for Manifest V3.
    if (settings.showIcon) {
        await chrome.action.enable(tabId);
        const baseIconName = `${settings.iconType}${shouldEnable ? '' : '-disabled'}.png`;
        const iconPathObject = {
            "16": `/img/addressicon/${baseIconName}`,
            "24": `/img/addressicon/${baseIconName}`,
            "32": `/img/addressicon/${baseIconName}`
        };
        chrome.action.setIcon({ path: iconPathObject, tabId: tabId });
        chrome.action.setTitle({ title: settings.iconTitle, tabId: tabId });
    } else {
        await chrome.action.disable(tabId);
    }
}

async function hotkeyChange() {
    const settings = await chrome.storage.local.get(['enableToggle', 'hotkey', 'paranoidhotkey']);
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

    for (const tab of tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: (hotkeyEnabled, hotkey, paranoidHotkey) => {
                if (typeof hotkeySet === 'function') {
                    hotkeySet(hotkeyEnabled, hotkey, paranoidHotkey);
                }
            },
            args: [settings.enableToggle, settings.hotkey, settings.paranoidhotkey]
        }).catch(err => console.log(`Failed to inject hotkey script:`, err));
    }
}

async function recursiveCloak(shouldEnable, isGlobalToggle) {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

    for (const tab of tabs) {
        const domainStatus = await domainCheck(extractDomainFromURL(tab.url));
        if (domainStatus === '1') {
            // blacklist
            await magician(true, tab.id);
        } else if (domainStatus === '0') {
            // whitelist
            await magician(false, tab.id);
        } else {
            // normal page
            await magician(shouldEnable, tab.id);
        }
    }
}

// CHANGED: All logic is now async and uses `magician`.
async function dpHandle(tab) {
    const settings = await chrome.storage.local.get(['global', 'enable']);
    if (settings.global && await domainCheck(extractDomainFromURL(tab.url)) != 1) {
        const newEnableState = !settings.enable;
        await chrome.storage.local.set({ enable: newEnableState });
        await recursiveCloak(newEnableState, true);
    } else {
        const dpTabId = tab.windowId + "|" + tab.id;
        const dpcloakindex = cloakedTabs.indexOf(dpTabId);

        await chrome.storage.local.set({ enable: true });

        if (dpcloakindex !== -1) { // Is currently cloaked, so uncloak it
            await magician(false, tab.id);
            if (!uncloakedTabs.includes(dpTabId)) uncloakedTabs.push(dpTabId);
            cloakedTabs.splice(dpcloakindex, 1);
        } else { // Is not cloaked, so cloak it
            await magician(true, tab.id);
            if (!cloakedTabs.includes(dpTabId)) cloakedTabs.push(dpTabId);
            uncloakedTabs = uncloakedTabs.filter(item => item !== dpTabId);
        }
    }
}

// =================================================================
// MESSAGE LISTENERS (REFACTORED for ASYNC) 
// =================================================================

// NEW: Handlers for messages from the refactored options page.
const messageDispatchTable = {
    "get-enabled": async (request, sender, sendResponse) => {
        const settings = await chrome.storage.local.get(['s_bg', 'disableFavicons', 'hidePageTitles', 'pageTitleText', 'enableToggle', 'hotkey', 'paranoidhotkey']);
        const dpTabId = sender.tab.windowId + "|" + sender.tab.id;
        const dpcloakindex = cloakedTabs.indexOf(dpTabId);
        const isEnabled = await enabled(sender.tab, dpcloakindex);
        if (isEnabled && dpcloakindex === -1) cloakedTabs.push(dpTabId);

        sendResponse({
            enable: isEnabled,
            background: settings.s_bg,
            favicon: settings.disableFavicons,
            hidePageTitles: settings.hidePageTitles,
            pageTitleText: settings.pageTitleText,
            enableToggle: settings.enableToggle,
            hotkey: settings.hotkey,
            paranoidhotkey: settings.paranoidhotkey
        });
    },
    "get-settings": async (request, sender, sendResponse) => {
        const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
        let fontface = (settings.font === '-Custom-' && settings.customfont) ? settings.customfont : settings.font || 'Arial';
        sendResponse({ ...settings, font: fontface, enable: settings.global ? await enabled(sender.tab) : true });
    },
    "toggle": async (request, sender, sendResponse) => {
        let { sfwmode, savedsfwmode, global } = await chrome.storage.local.get(['sfwmode', 'savedsfwmode', 'global']);
        if (savedsfwmode !== "") {
            await chrome.storage.local.set({ sfwmode: savedsfwmode, savedsfwmode: "", enable: true });
            if (global) await recursiveCloak(true, true);
            else {
                await magician(true, sender.tab.id);
                const dpTabId = sender.tab.windowId + "|" + sender.tab.id;
                if (!cloakedTabs.includes(dpTabId)) cloakedTabs.push(dpTabId);
                uncloakedTabs = uncloakedTabs.filter(item => item !== dpTabId);
            }
        } else {
            await dpHandle(sender.tab);
        }
    },
    "toggleparanoid": async (request, sender, sendResponse) => {
        let { sfwmode, savedsfwmode, global } = await chrome.storage.local.get(['sfwmode', 'savedsfwmode', 'global']);
        if (savedsfwmode === "") {
            await chrome.storage.local.set({ savedsfwmode: sfwmode, sfwmode: "Paranoid", enable: true });
            if (global) await recursiveCloak(true, true);
            else {
                await magician(true, sender.tab.id);
                const dpTabId = sender.tab.windowId + "|" + sender.tab.id;
                if (!cloakedTabs.includes(dpTabId)) cloakedTabs.push(dpTabId);
                uncloakedTabs = uncloakedTabs.filter(item => item !== dpTabId);
            }
        } else {
            await chrome.storage.local.set({ sfwmode: savedsfwmode, savedsfwmode: "" });
            await dpHandle(sender.tab);
        }
    },
    // These are messages from our options page
    "optionsSaved": (request, sender, sendResponse) => {
        console.log("Options saved:", request);
    },
    "hotkeyChange": (request, sender, sendResponse) => {
        hotkeyChange(); // This function can remain as is, it just injects scripts.
    },
    "domainChange": async (request, sender, sendResponse) => {
        await domainHandler(request.domain, request.type);
    },
    "initLists": async (request, sender, sendResponse) => {
        await initLists();
    }
};

async function initLists() {
    const { whiteList, blackList } = await chrome.storage.local.get(["whiteList", "blackList"]);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || request.reqtype; // Handle both new and old message formats
    if (action && messageDispatchTable[action]) {
        messageDispatchTable[action](request, sender, sendResponse);
        return true; // Indicates an async response.
    }
});

// =================================================================
// EVENT LISTENERS (REFACTORED for ASYNC)
// =================================================================

// UPDATED: Replaced `pageAction` with `action`. Callback is now async.
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url || tab.url.startsWith('chrome://')) {
        return;
    }
    await dpHandle(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "loading" || !tab.url || tab.url.startsWith('chrome://')) return;

    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    const dpTabId = tab.windowId + "|" + tabId;
    const isEnabled = await enabled(tab);

    if (settings.showIcon) {
        await chrome.action.enable(tabId);
        const baseIconName = `${settings.iconType}${isEnabled ? '' : '-disabled'}.png`;
        const iconPathObject = {
            "16": `/img/addressicon/${baseIconName}`,
            "24": `/img/addressicon/${baseIconName}`,
            "32": `/img/addressicon/${baseIconName}`
        };
        chrome.action.setIcon({ path: iconPathObject, tabId: tabId });
        chrome.action.setTitle({ title: settings.iconTitle, tabId: tabId });
    } else {
        await chrome.action.disable(tabId);
    }

    if (isEnabled) {
        await magician(true, tabId);
        if (!settings.global && !settings.enable) await chrome.storage.local.set({ enable: true });
        if (!cloakedTabs.includes(dpTabId)) cloakedTabs.push(dpTabId);
        uncloakedTabs = uncloakedTabs.filter(item => item !== dpTabId);
    } else if (settings.enableStickiness && tab.openerTabId) {
        // Logic for stickiness, now async
        if (cloakedTabs.includes(tab.windowId + "|" + tab.openerTabId) && !uncloakedTabs.includes(dpTabId)) {
            if (await domainCheck(extractDomainFromURL(tab.url)) !== '0') {
                await magician(true, tabId);
                cloakedTabs.push(dpTabId);
            }
        }
    }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    const dpTabId = removeInfo.windowId + "|" + tabId;
    cloakedTabs = cloakedTabs.filter(item => item !== dpTabId);
    uncloakedTabs = uncloakedTabs.filter(item => item !== dpTabId);
});

// =================================================================
// 🚀 INITIALIZATION 🚀
// =================================================================

// CHANGED: Replaced `setDefaultOptions` with a more robust initialization.
async function initializeExtension() {
    // Get existing settings. If a key is missing in storage, it returns the value from DEFAULT_SETTINGS (the argument).
    // But we want to know what is ACTUALLY in storage vs what is default.
    // Actually, chrome.storage.local.get(defaults) returns the defaults merged with storage.
    // So 'settings' here ALREADY contains the merged result of (defaults + storage).
    // Wait, if I do get(DEFAULT_SETTINGS), it returns an object with all keys.
    // If I then do set({...settings, ...DEFAULT_SETTINGS}), I am overwriting with defaults again if I am not careful?
    // No, wait.
    // If storage has { enable: false } and DEFAULT has { enable: true }.
    // get(DEFAULT) returns { enable: false }.
    // Then {...settings} is { enable: false }.
    // {...DEFAULT_SETTINGS} is { enable: true }.
    // So {...settings, ...DEFAULT_SETTINGS} results in { enable: true } (WRONG!).
    // It MUST be {...DEFAULT_SETTINGS, ...settings}.

    // However, since we used get(DEFAULT_SETTINGS), 'settings' already has all the keys from DEFAULT_SETTINGS filled in with values from storage (or default if missing).
    // So simply saving 'settings' back is mostly fine, EXCEPT if we want to ensure new keys from a new version are added.

    // Correct logic:
    // 1. Get EVERYTHING from storage (no defaults).
    const stored = await chrome.storage.local.get(null);

    // 2. Merge: Defaults -> Stored -> Version update
    const finalSettings = { ...DEFAULT_SETTINGS, ...stored, version: version };

    console.log("Initializing Decreased Productivity...");

    // 3. Save back
    await chrome.storage.local.set(finalSettings);

    // Set up the context menus
    if (finalSettings.showContext) {
        setupContextMenus();
    }

    if (finalSettings.showUpdateNotifications) {
        // You could open an update page here if it's a major version change.
        // chrome.tabs.create({ url: 'updated.html' });
    }

    console.log("Initialization complete.");
}

function setupContextMenus() {
    chrome.contextMenus.removeAll(async () => {
        const settings = await chrome.storage.local.get(['enable']);

        chrome.contextMenus.create({
            id: "dp_whitelist",
            title: chrome.i18n.getMessage("whitelistdomain"),
            contexts: ['action']
        });
        chrome.contextMenus.create({
            id: "dp_blacklist",
            title: chrome.i18n.getMessage("blacklistdomain"),
            contexts: ['action']
        });
        chrome.contextMenus.create({
            id: "dp_remove",
            title: chrome.i18n.getMessage("removelist"),
            contexts: ['action']
        });
        if (settings.showContext) {
            chrome.contextMenus.create({
                id: "dp_opensafely",
                title: chrome.i18n.getMessage("opensafely"),
                contexts: ['link', 'image']
            });
        }
    });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab.url || tab.url.startsWith('chrome://')) return;
    const domain = extractDomainFromURL(tab.url);

    switch (info.menuItemId) {
        case "dp_whitelist":
            await domainHandler(domain, 0);
            await magician(false, tab.id);
            break;
        case "dp_blacklist":
            await domainHandler(domain, 1);
            await magician(true, tab.id);
            break;
        case "dp_remove":
            await domainHandler(domain, 2);
            const shouldBeEnabled = await enabled(tab);
            await magician(shouldBeEnabled, tab.id);
            break;
        case "dp_opensafely":
            const url = info.mediaType ? info.srcUrl : info.linkUrl;
            chrome.tabs.create({ url: url }, async (newTab) => {
                cloakedTabs.push(newTab.windowId + "|" + newTab.id);
                await magician(true, newTab.id);
            });
            break;
    }
});


// Run initialization logic ONLY when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(async (details) => {
    // details.reason will tell us if it's "install" or "update"
    console.log(`Extension event: ${details.reason}`);

    // CHANGED: Do NOT unconditionally reset settings.
    // await chrome.storage.local.set(DEFAULT_SETTINGS); <-- REMOVED

    await initializeExtension();

    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    if (settings.showUpdateNotifications && details.reason === "update") {
        // Open only when updated
        // chrome.tabs.create({ url: 'updated.html' });
    }
});