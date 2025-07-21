(() => {
    'use strict';

    window.dpSettings = window.dpSettings || {};
    window.dpTitleObserver = window.dpTitleObserver || null;
    window.dpBodyObserver = window.dpBodyObserver || null;
    window.dpOriginalTitle = window.dpOriginalTitle || null;
    let postloaddelay;
    let dphotkeylistener;

    window.runDP = function() {
        const settings = window.dpSettings;
        if (!settings || !settings.enable) {
            removeCss();
            return;
        }
        
        if (typeof hotkeySet === 'function') {
            hotkeySet(settings.enableToggle, settings.hotkey, settings.paranoidhotkey);
        }

        if (settings.favicon) faviconblank();
        if (settings.hidePageTitles) {
            titleBind(settings.pageTitleText);
        } else {
            titleRestore();
        }

        const stealth = document.createElement("style");
        stealth.setAttribute("__decreased__", "initialstealth");
        stealth.innerText = `html * { visibility: hidden !important; }`;
        document.documentElement.appendChild(stealth);

        addCloak(settings);
        dpPostLoad(settings);
        
        startBodyObserver(settings);
    };

    window.removeCss = function() {
        if (window.dpBodyObserver) {
            window.dpBodyObserver.disconnect();
            window.dpBodyObserver = null;
        }
        titleRestore();

        const styleTags = document.querySelectorAll('style[__decreased__]');
        styleTags.forEach(tag => {
            tag.disabled = true;
            tag.textContent = '';
            tag.remove();
        });
        
        if (typeof jQuery !== 'undefined') {
            jQuery("[__decreased__]").each(function() {
                jQuery(this).removeClass((i, className) => (className.match(/dp\d+_\w+/g) || []).join(' ')).removeAttr("__decreased__");
            });
        }
        
        faviconrestore();
    }
    let timestamp = Math.round(new Date().getTime()/1000.0);

    function addCloak(settings) {
        
        let { sfwmode: sfw, font: f, fontsize: fsize, underline: u, background: bg, s_text: text, s_table: table, s_link: link, bold, opacity1: o1, opacity2: o2, collapseimage: collapseimage, customcss: customcss } = settings;
        
        const cssinject = document.createElement("style");
        cssinject.setAttribute("__decreased__", "productivity");

        var curlocation = document.location.href;
        var boldcss = '';
        var fontType = '';
        
        if (f != 'Serif' && f != 'Monospace' && f != '-Unchanged-') f = '"' + f + '", sans-serif';
        if (f != '-Unchanged-') fontType = 'font-size: ' + fsize + 'px !important; font-family: ' + f + ' !important; h1, h2, h3, h4, h5, h6, h7, h8 { font-size: ' + fsize + 'px !important; font-weight: bold !important; } ';
        
        if (bold) boldcss = 'font-weight: normal !important; ';
        
        // The code that does the magic
        var magic = 'html, html *, html *[style], body *:before, body *:after { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; border-collapse: collapse !important; color: #' + text + ' !important; stroke: #' + text + ' !important; fill: #' + bg + ' !important; ' + fontType + 'text-decoration: none !important; -webkit-filter: initial !important; box-shadow: none !important; -webkit-box-shadow: none !important; text-shadow: none !important; ' + boldcss + '} ';
        if (curlocation.match(/^https?:\/\/www\.facebook\.com\//i)) {
            magic += 'html, html *:not(.img), body *:not(.img):before, body *:not(.img):after { background-image: none !important; } ';
            magic += '*:after { content: initial !important; }  ';
            if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') magic += 'i.img { opacity: '+o1+' !important; } i.img:hover { opacity: '+o2+' !important; } ';
            else if (o1 == 0 && collapseimage) magic += 'i.img { display: none !important; } ';
            else if (sfw == 'Paranoid') magic += 'i.img { visibility: hidden !important; opacity: 0 !important; } ';
        } else {
            if (!curlocation.match(/^https?:\/\/web\.whatsapp\.com\//i)) magic += 'html, html *, body *:before, body *:after { background-image: none !important; } ';
        }
        if (curlocation.match(/^https?:\/\/www\.engadget\.com\//i)) {
            magic += 'html, html *, html *[style], body *:before, body *:after { border-width: 0px !important; }';
        } else {
            magic += 'html, html *, html *[style], body *:before, body *:after { border-width: 1px !important; }';
        }
        magic += 'input[type=text],input[type=password],input[type=file],input[type=search],textarea,input[type=button],input[type=submit],#lastpass-notification button[type="button"] { border: 1px dotted #' + table + ' !important; background-color: #' + bg + ' !important; color: #' + text + ' !important; } html::selection, html *::selection { background: #888888 !important; color: #fff !important; } a { color: #' + link + ' !important; text-decoration: ';
        
        if (u) magic += 'underline !important; }';
        else magic += 'none !important; }';
        
        if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') {
            if (o1 == 0 && collapseimage) magic += ' iframe, img, canvas, input[type=image], path, polygon, picture { display: none !important; }';
            else magic += ' iframe, img, canvas, input[type=image], path, polygon, picture { opacity: '+o1+' !important; } iframe:hover, img:hover, input[type=image]:hover, path:hover, polygon:hover { opacity: '+o2+' !important; }';
        }
        if (sfw == 'SFW') {
            if (o1 == 0 && collapseimage) magic += ' object, embed, param, video, audio { display: none !important; }';
            else magic += ' object, embed, param, video, audio { opacity: '+o1+' !important; } object:hover, embed:hover, param:hover, video:hover, audio:hover { opacity: '+o2+' !important; }';
        }
        if (sfw == 'SFW1') magic += ' object, embed, param, video, audio { display: none !important; opacity: 0 !important; }';
        if (sfw == 'Paranoid') magic += ' img, canvas, input[type=image], path, polygon, object, embed, param, video, audio, picture { display: none !important; opacity: 0 !important; } iframe { opacity: 0.05 !important; } iframe:hover { opacity: 0.5 !important; }';
        
        magic += ' .dp'+timestamp+'_visible { visibility: visible !important; opacity: 1 !important; }';
        magic += ' .dp'+timestamp+'_unbold { font-weight: normal !important }';
        magic += ' .dp'+timestamp+'_link { color: #'+link+' !important; background-color: #'+bg+' !important; background-image: none !important; }';
        if (curlocation.match(/^https?:\/\/web\.whatsapp\.com\//i)) magic += ' .dp'+timestamp+'_text { color: #'+text+' !important; background-color: #'+bg+' !important; }';
        else magic += ' .dp'+timestamp+'_text { color: #'+text+' !important; background-color: #'+bg+' !important; background-image: none !important; }';
        magic += ' .dp'+timestamp+'_hide { display: none !important }';
        
        if (curlocation.match(/^https?:\/\/www\.(?:facebook\.com|facebookcorewwwi\.onion)\//i)) {
            magic += " ._52c6, ._5ine, .__cy, .fbPhotosPhotoTagboxes, ._jfi, ._5vb_ ._5aqh::before { position: initial !important; } "; // fix link caption, event cover photo, full-screen photo mode (._jfi = uploaded image thumbnail), instagram
            magic += " ._4zoz._4zoz._4zoz, ._559p { clear: both !important; } "; // fix main timeline post status box
            magic += " ._2yq ._4-u2::before { background-color: transparent !important; } "; // fix main timeline post title bars
            magic += " ._2-sx { position: absolute !important; top: 0 !important; left: 0 !important; } "; // fix spotlight photo positioning
            magic += " ._4d3w._2nw8 ._4g9v, ._4d3w._2nw8 ._4g9v *, ._4d3w._2nw8 .snowliftOverlayBar, ._4d3w .rightButtons .overlayBarButtons, ._4d3w .rightButtons .overlayBarButtons * { background-color: transparent !important; } "; // make spotlight top/bottom bars transparent
            magic += " ._1ift { pointer-events: initial !important; } "; // make chat icons react to hover
            magic += " ._3htz { display: none !important; } "; // hide video overlay
        }
        else if (curlocation.match(/^https?:\/\/www\.youtube\.com\//i)) {
            magic += " .ytp-gradient-top, .ytp-gradient-bottom { display: none !important; } "; // improve embedded youtube display
            magic += " .ytp-chrome-top, .ytp-title, .ytp-title *, .ytp-chrome-bottom[style], .ytp-chrome-bottom * { background-color: transparent !important; } "; // improve embedded youtube display
            magic += " .ytp-play-button:not(.ytp-play-button-playlist)::before, .ytp-fullscreen-button::after { display: none !important; } "; // improve embedded youtube display
            magic += " .like-button-renderer-like-button:before, .like-button-renderer-dislike-button:before, .yt-high-contrast-mode-white .yt-uix-button-subscribe-branded:before { content: '' !important; } ";
        }
        else if (curlocation.match(/^https?:\/\/www\.instagram\.com\//i)) {
            magic += " ._ovg3g, ._njmhc { position: initial !important; } ._sppa1 { display: none !important; } ";
        }
        else if (curlocation.match(/^https?:\/\/web\.whatsapp\.com\//i)) {
            magic += " .app > div, .app > div > div, .app > div > div > span { background-color: transparent !important; } "; // fix blank white screen
            magic += " .message-in { float: none !important; } "; // fix incoming message display
            magic += " .msg { clear: both !important; } "; // fix outgoing message display
            magic += ' .copyable-text, .copyable-text > div { background-color: transparent !important; } '; // fix message timestamping
            magic += ' .message-in, .message-out { border: 1px dotted #' + table + ' !important; } '; // distinguish bubbles
            magic += ' .drawer-manager, .drawer-manager > .pane { background-color: transparent !important; } '; // fix white screen bug
            magic += ' .video-thumb, .video-thumb > div { background-color: transparent !important; } '; // show video thumbnails
            magic += ' .message-out .tail-container { display: none !important; } '; // hide message out tail
            if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') {
                magic += ' div[data-asset-intro-image="true"] { opacity: '+o1+' !important; } div[data-asset-intro-image="true"]:hover { opacity: '+o2+' !important; } '; // add cloak support for welcome graphic
                magic += ' .icon { opacity: '+o1+' !important; } .icon:hover { opacity: '+o2+' !important; } '; // add cloak support for welcome graphic
                magic += ' .video-thumb > div { opacity: '+o1+' !important; } .video-thumb > div:hover { opacity: '+o2+' !important; } '; // add cloak support for video thumbnails
                magic += ' .emojik { opacity: '+o1+' !important; } .emojik:hover { opacity: '+o2+' !important; } '; // add cloak support for emoji list
            } else if (sfw == 'Paranoid') magic += ' div[data-asset-intro-image="true"] { display: none !important; } '; // hide welcome graphic
            magic += ' .copyable-text img { pointer-events: initial !important; } '; // make emojis and icons at cloak-hover opacity
        }
        else if (curlocation.match(/^https?:\/\/twitter\.com\//i)) {
            magic += " .QuoteTweet, .QuoteTweet *, #playerContainer, #playerContainer *, .Gallery, .Gallery * { background-color: transparent !important; } ";
            if (sfw != 'Paranoid' && sfw != 'SFW1') magic += " #playerContainer video { opacity: 1 !important; } ";
            magic += " .Grid--withGutter>.Grid-cell { margin-right: -1px !important; margin-left: -1px !important; } ";
        }
        else if (curlocation.match(/^https?:\/\/plus\.google\.com\//i)) {
            magic += " .x2 { position: initial !important; } ";
        }
        else if (curlocation.match(/^https?:\/\/www\.engadget\.com\//i)) {
            magic += " .o-hit { cursor: initial !important; } ";
            magic += " .o-hit .o-hit__link { position: initial !important; } ";
        }
        else if (curlocation.match(/^https?:\/\/.+\.wikia\.com\//i)) {
            magic += " body.background-dynamic.skin-oasis::after, body.background-dynamic.skin-oasis::before { background-image: none !important; } ";
        }
        else if (curlocation.match(/^https?:\/\/.*\.?((lifehack|gawk)er|deadspin|jalopnik|gizmodo|jezebel|kotaku)\.com\//i)) {
            magic += " .img-border:after { position: initial !important; } ";
        }
        else if (curlocation.match(/^https?:\/\/www\.reddit\.com\//i)) {
            magic += ' .res-nightmode #header-bottom-right { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; } ';
            magic += ' .RES-keyNav-activeElement, .RES-keyNav-activeElement .md-container, .res-commentBoxes .comment, .res-commentBoxes .comment .comment, .res-commentBoxes .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment .comment  { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; } ';
            magic  += ' .res-nightmode .link, .res-nightmode .RES-keyNav-activeElement, .res-nightmode .RES-keyNav-activeElement .md-container, .res-nightmode.res-commentBoxes .comment, .res-nightmode.res-commentBoxes .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment .comment { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; } ';
            magic += ' .res-nightmode #header-bottom-right a, .res-nightmode a.title, .res-nightmode a.title:visited, .res-nightmode .RES-keyNav-activeElement > .tagline, .res-nightmode .RES-keyNav-activeElement .md-container > .md, .res-nightmode .RES-keyNav-activeElement .md-container > .md p, .res-nightmode #search input[type="text"] { color: #' + text + ' !important; } ';
            magic += ' .usertext-edit textarea { border: 1px dotted #' + table + ' !important; } ';
        }
        if (customcss) magic += customcss.replace(/(?:\r\n|\r|\n)/g, ' ');
        if (jQuery("style[__decreased__='productivity"+timestamp+"']").length) {
            jQuery("style[__decreased__='productivity"+timestamp+"']").remove();
            jQuery("[__decreased__]").each(function() {
                jQuery(this).removeClass('dp'+timestamp+'_visible dp'+timestamp+'_unbold dp'+timestamp+'_link dp'+timestamp+'_text dp'+timestamp+'_hide').removeAttr("__decreased__");
            });
        }
        cssinject.innerText = magic;
        document.documentElement.appendChild(cssinject);
        document.querySelectorAll('style[__decreased__="initialstealth"]').forEach(el => el.remove());
    }

    function dpPostLoad(settings) {
        const { maxheight: dpheight, maxwidth: dpwidth, sfwmode, bold } = settings;
        if (typeof jQuery === 'undefined') return;
        
        if (dpwidth > 0 && dpheight > 0) {
            jQuery("img:not([__decreased__])").each(function() {
                jQuery(this).attr('__decreased__', 'image');
                if (this.width <= dpwidth && this.height <= dpheight) jQuery(this).addClass('dp_visible');
                else if (sfwmode === "Paranoid") jQuery(this).addClass('dp_hide');
            });
        }
        if (bold) {
            jQuery("a:not([__decreased__='link"+timestamp+"'])").addClass('dp'+timestamp+'_link dp'+timestamp+'_unbold').attr('__decreased__', 'link'+timestamp);
            jQuery("body *:not([__decreased__])").addClass('dp'+timestamp+'_text dp'+timestamp+'_unbold').attr('__decreased__', 'element'+timestamp);
        } else {
            jQuery("a:not([__decreased__='link"+timestamp+"'])").addClass('dp'+timestamp+'_link').attr('__decreased__', 'link'+timestamp);
            jQuery("body *:not([__decreased__])").addClass('dp'+timestamp+'_text').attr('__decreased__', 'element'+timestamp);
        }
    }

    function replaceTitle(newTitle) {
        if (window.dpOriginalTitle === null) {
            window.dpOriginalTitle = document.title;
        }
        document.title = newTitle;
    }

    function titleBind(newTitle) {
        replaceTitle(newTitle);
        const titleElement = document.querySelector('head > title');
        if (!titleElement) return;
        
        if (window.dpTitleObserver) window.dpTitleObserver.disconnect();

        const observer = new MutationObserver(() => {
            if (document.title !== newTitle) {
                observer.disconnect();
                document.title = newTitle;
                observer.observe(titleElement, { childList: true });
            }
        });

        observer.observe(titleElement, { childList: true });
        window.dpTitleObserver = observer;
    }

    function titleRestore() {
        if (window.dpTitleObserver) {
            window.dpTitleObserver.disconnect();
            window.dpTitleObserver = null;
        }
        if (window.dpOriginalTitle !== null) {
            document.title = window.dpOriginalTitle;
            window.dpOriginalTitle = null;
        }
    }

    //Dynamic Content Monitoring
    function startBodyObserver(settings) {
        if (window.dpBodyObserver) window.dpBodyObserver.disconnect();

        const observerCallback = (mutations) => {
            clearTimeout(postloaddelay);
            postloaddelay = setTimeout(() => {
                dpPostLoad(settings);
            }, 500);
        };
        
        window.dpBodyObserver = new MutationObserver(observerCallback);

        const config = { childList: true, subtree: true };
        window.dpBodyObserver.observe(document.body, config);
    }

    // Favicon.js - Change favicon dynamically [http://ajaxify.com/run/favicon].
    // Copyright (c) 2006 Michael Mahemoff
    // Modifications - Andrew Y.
    function faviconblank() {
        jQuery(document).ready(function() {
            if (!jQuery("link#decreasedproductivity"+timestamp).length) {
                var link = document.createElement("link");
                link.type = "image/x-icon";
                link.rel = "shortcut icon";
                link.id = "decreasedproductivity"+timestamp;
                link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9oFFAADATTAuQQAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAEklEQVQ4y2NgGAWjYBSMAggAAAQQAAGFP6pyAAAAAElFTkSuQmCC'; // transparent png
                faviconclear();
                document.getElementsByTagName("head")[0].appendChild(link);
            }
        });
    }
    function faviconclear() {
        jQuery("link[rel='shortcut icon'], link[rel='icon']").each(function() {
            jQuery(this).attr('data-rel', jQuery(this).attr('rel')).removeAttr('rel');
        });
    }
    function faviconrestore() {
        jQuery("link#decreasedproductivity"+timestamp).remove();
        jQuery("link[data-rel='shortcut icon'], link[data-rel='icon']").each(function() {
            jQuery(this).attr('rel', jQuery(this).attr('data-rel')).removeAttr('data-rel');
        });
    }
    
    function hotkeySet(hotkeyenabled, hotkey, paranoidhotkey) {
        if (dphotkeylistener) dphotkeylistener.reset();
        if (hotkeyenabled) {
            dphotkeylistener = new window.keypress.Listener();
            if (hotkey) {
                dphotkeylistener.simple_combo(hotkey.toLowerCase(), function() {
                    chrome.runtime.sendMessage({reqtype: "toggle"});
                });
            }
            if (paranoidhotkey) {
                dphotkeylistener.simple_combo(paranoidhotkey.toLowerCase(), function() {
                    chrome.runtime.sendMessage({reqtype: "toggleparanoid"});
                });
            }
        }
    }
})(); // IIFE