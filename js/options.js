// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph
// CHANGED: Get version using the modern, synchronous API.
const version = chrome.runtime.getManifest().version;

// This is deprecated and must be replaced with `chrome.runtime.sendMessage`.
// const bkg = chrome.extension.getBackgroundPage(); 

let error = false;
let oldglobalstate = false;


document.addEventListener('DOMContentLoaded', async () => {
    // Event listeners remain mostly the same
    $("#tabs").tabs();
    $("#o1").slider({min: 0, max: 1, step: 0.05, slide: (event, ui) => { $("#opacity1").val(ui.value); opacitytest(); }, stop: (event, ui) => { 
        if (ui.value == 0) $("#collapseimageblock").show();
        else $("#collapseimageblock").hide();
        saveOptions();
    }});
    $("#o2").slider({min: 0, max: 1, step: 0.05, slide: (event, ui) => { $("#opacity2").val(ui.value); opacitytest(); }, stop: (event, ui) => { saveOptions(); }});
    
    // CHANGED: Call the new async loadOptions
    await loadOptions();

    colorPickLoad("s_bg");
    colorPickLoad("s_text");
    colorPickLoad("s_link");
    colorPickLoad("s_table");

    // Other event listeners
    $(".i18_save, .i18_savecolours").click(saveOptions);
    $(".i18_revertcolours").click(revertColours);
    $(".i18_addwhitelist").click(() => addList(0));
    $(".i18_addblacklist").click(() => addList(1));
    $(".i18_dpoptions").click(() => { location.href='options.html'; });
    $(".i18_clear").click(function() {
        if ($(this).parent().find('strong').hasClass('i18_whitelist')) {
            listclear(0);
        } else {
            listclear(1);
        }
    });

    // Simplified event listeners
    const elementsToSaveOnClick = "#enable, #enableToggle, #enableStickiness, #disableFavicons, #hidePageTitles, #showUnderline, #collapseimage, #removeBold, #showContext, #showIcon, #showUpdateNotifications, #global";
    $(elementsToSaveOnClick).click(saveOptions);
    $("#iconTitle, #customcss, #opacity1, #opacity2, #maxwidth, #maxheight, #pageTitleText").blur(saveOptions);
    $("#s_bg, #s_text, #s_link, #s_table").keyup(updateDemo);
    $("#font, #newPages, #sfwmode, #iconType, #fontsize").change(saveOptions);

    $("#s_preset").change(function() {
        stylePreset($(this).val());
    });
    
    $("#iconType").change(function() {
        $("#sampleicon").attr('src', '../img/addressicon/'+$(this).val()+'.png');
    });

    $("#settingsall").click(() => $("#settingsexport").select());
    $("#importsettings").click(settingsImport);
    $("#savetxt").click(downloadtxt);
    $(".i18_close").click(() => window.close());
});

// =================================================================
// ⭐️ CORE DATA FUNCTIONS (REFACTORED) ⭐️
// =================================================================

// CHANGED: Replaced all individual load/save functions with two core async functions.
async function loadOptions() {
    document.title = chrome.i18n.getMessage("dpoptions");
    i18load();

    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

    // Populate UI from the single settings object
    $("#enable").prop('checked', settings.enable);
    $("#global").prop('checked', settings.global);
    $("#enableToggle").prop('checked', settings.enableToggle);
    $("#hotkey").val(settings.hotkey.toUpperCase());
    $("#paranoidhotkey").val(settings.paranoidhotkey.toUpperCase());
    $("#newPages").val(settings.newPages);
    $("#sfwmode").val(settings.sfwmode);
    $("#opacity1").val(settings.opacity1);
    $("#opacity2").val(settings.opacity2);
    $("#collapseimage").prop('checked', settings.collapseimage);
    $("#colorbackground").prop (settings.colorbackground);
    $("#showIcon").prop('checked', settings.showIcon);
    $("#iconType").val(settings.iconType);
    $("#iconTitle").val(settings.iconTitle);
    $("#disableFavicons").prop('checked', settings.disableFavicons);
    $("#hidePageTitles").prop('checked', settings.hidePageTitles);
    $("#pageTitleText").val(settings.pageTitleText);
    $("#maxwidth").val(settings.maxwidth);
    $("#maxheight").val(settings.maxheight);
    $("#enableStickiness").prop('checked', settings.enableStickiness);
    $("#showContext").prop('checked', settings.showContext);
    $("#showUnderline").prop('checked', settings.showUnderline);
    $("#removeBold").prop('checked', settings.removeBold);
    $("#showUpdateNotifications").prop('checked', settings.showUpdateNotifications);
    $("#font").val(settings.font);
    $("#customfont").val(settings.customfont);
    $("#fontsize").val(settings.fontsize);
    $("#s_text").val(settings.s_text);
    $("#s_bg").val(settings.s_bg);
    $("#s_table").val(settings.s_table);
    $("#s_link").val(settings.s_link);
    $("#customcss").val(settings.customcss);

    oldglobalstate = settings.global;

    // Update UI visibility based on loaded settings
    updateUIVisibility();
    await listUpdate();
    updateDemo();
    opacitytest();
}

async function saveOptions() {
    // Create a settings object from all the UI elements
    const settings = {
        enable: $("#enable").is(':checked'),
        global: $("#global").is(':checked'),
        enableToggle: $("#enableToggle").is(':checked'),
        hotkey: $("#hotkey").val() || 'CTRL F12',
        paranoidhotkey: $("#paranoidhotkey").val() || 'ALT P',
        newPages: $("#newPages").val(),
        sfwmode: $("#sfwmode").val(),
        opacity1: $("#opacity1").val(),
        opacity2: $("#opacity2").val(),
        collapseimage: $("#collapseimage").is(':checked'),
        colorbackground: $("#colorbackground").val(),
        showIcon: $("#showIcon").is(':checked'),
        iconType: $("#iconType").val(),
        iconTitle: $("#iconTitle").val(),
        disableFavicons: $("#disableFavicons").is(':checked'),
        hidePageTitles: $("#hidePageTitles").is(':checked'),
        pageTitleText: $("#pageTitleText").val() || 'Google Chrome',
        maxwidth: $("#maxwidth").val(),
        maxheight: $("#maxheight").val(),
        enableStickiness: $("#enableStickiness").is(':checked'),
        showContext: $("#showContext").is(':checked'),
        showUnderline: $("#showUnderline").is(':checked'),
        removeBold: $("#removeBold").is(':checked'),
        showUpdateNotifications: $("#showUpdateNotifications").is(':checked'),
        font: $("#font").val(),
        customfont: $("#customfont").val(),
        fontsize: $("#fontsize").val(),
        s_text: $("#s_text").val(),
        s_bg: $("#s_bg").val(),
        s_table: $("#s_table").val(),
        s_link: $("#s_link").val(),
        customcss: $("#customcss").val().replace(/\s*<([^>]+)>\s*/ig, "")
    };

    // Save the single object
    await chrome.storage.local.set(settings);

    // CHANGED: Use async messaging instead of the old way.
    chrome.runtime.sendMessage({ action: "optionsSaved", oldGlobalState: oldglobalstate, newGlobalState: settings.global });
    chrome.runtime.sendMessage({ action: "hotkeyChange" });
    
    updateUIVisibility();
    updateDemo();
    notification(chrome.i18n.getMessage("saved"));
}

// =================================================================
// 📝 LIST MANAGEMENT FUNCTIONS (REFACTORED) 📝
// =================================================================

async function addList(type) {
    const domain = $('#url').val().toLowerCase();
    if (!domain.match(/^(?:[\-\w\*\?]+(\.[\-\w\*\?]+)*|((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})|\[[A-Fa-f0-9:.]+\])?$/g)) {
        notification(chrome.i18n.getMessage("invaliddomain"));
        return;
    }
    
    const { whiteList, blackList } = await chrome.storage.local.get(["whiteList", "blackList"]);
    const list = (type === 0) ? whiteList : blackList;
    const key = (type === 0) ? "whiteList" : "blackList";

    if (!list.includes(domain)) {
        list.push(domain);
        await chrome.storage.local.set({ [key]: list });
    }

    $('#url').val('');
    notification([chrome.i18n.getMessage("whitelisted"),chrome.i18n.getMessage("blacklisted")][type]+' '+domain+'.');
    await listUpdate();
    $('#url').focus();
}

async function domainRemover(domain) {
    const { whiteList, blackList } = await chrome.storage.local.get(["whiteList", "blackList"]);
    
    const newWhiteList = whiteList.filter(item => item !== domain);
    const newBlackList = blackList.filter(item => item !== domain);

    await chrome.storage.local.set({ whiteList: newWhiteList, blackList: newBlackList });
    await listUpdate();
}

async function listUpdate() {
    const { whiteList, blackList } = await chrome.storage.local.get(["whiteList", "blackList"]);

    const renderList = (list, message) => {
        if (list.length === 0) return `[${chrome.i18n.getMessage("empty")}]`;
        return list.sort().map(item => 
            `<div class="listentry">${item} <a href="#" style="color:#f00;float:right;" data-domain="${item}" class="domainRemover">X</a></div>`
        ).join('');
    };

    $('#whitelist').html(renderList(whiteList));
    $('#blacklist').html(renderList(blackList));
    
    $(".domainRemover").off('click').on('click', function(e) { 
        e.preventDefault();
        domainRemover($(this).data('domain'));
    });
    
    // CHANGED: Use async messaging instead of the old way.
    chrome.runtime.sendMessage({ action: "initLists" });
}

async function listclear(type) {
    const key = (type === 0) ? "whiteList" : "blackList";
    const msg = (type === 0) ? "removefromwhitelist" : "removefromblacklist";

    if (confirm(chrome.i18n.getMessage(msg) + '?')) {
        await chrome.storage.local.set({ [key]: [] });
        await listUpdate();
    }
}

// =================================================================
// ⚙️ IMPORT/EXPORT FUNCTIONS (REFACTORED) ⚙️
// =================================================================

async function downloadtxt() {
    // CHANGED: Export is now a clean JSON of the entire settings object.
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    const textToWrite = JSON.stringify(settings, null, 2); // Pretty-printed JSON
    const textFileAsBlob = new Blob([textToWrite], {type:'application/json'});
    const fileNameToSaveAs = `dp-settings-${new Date().toJSON().slice(0,10)}.json`;
    
    const downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.click();
    downloadLink.remove();
}

async function settingsImport() {
    const settingsJSON = $("#settingsimport").val();
    if (!settingsJSON.trim()) {
        notification(chrome.i18n.getMessage("pastesettings"));
        return;
    }

    try {
        // CHANGED: Simply parse the JSON and save it. Much more robust.
        const importedSettings = JSON.parse(settingsJSON);
        // Basic validation: check if a key from our defaults exists
        if (typeof importedSettings.enable === 'undefined') {
            throw new Error("Invalid settings file.");
        }
        await chrome.storage.local.set(importedSettings);
        await loadOptions(); // Reload the whole UI with new settings
        notification(chrome.i18n.getMessage("importsuccessoptions"));
        $("#settingsimport").val("");
    } catch (e) {
        notification("Error: Invalid settings file. Please use a valid JSON export.");
    }
}

// =================================================================
// 🎨 UI & HELPER FUNCTIONS (Mostly unchanged, some async) 🎨
// =================================================================

function updateUIVisibility() {
    // This function can be called after loading or saving to keep UI consistent.
    $('#global').is(':checked') ? $("#newPagesRow").hide() : $("#newPagesRow").show();
    $('#enableToggle').is(':checked') ? $("#hotkeyrow, #paranoidhotkeyrow").show() : $("#hotkeyrow, #paranoidhotkeyrow").hide();
    $('#hidePageTitles').is(':checked') ? $("#pageTitle").show() : $("#pageTitle").hide();
    $('#showIcon').is(':checked') ? $(".discreeticonrow").show() : $(".discreeticonrow").hide();
    const sfwMode = $('#sfwmode').val();
    (sfwMode === 'SFW' || sfwMode === 'SFW1' || sfwMode === 'SFW2') ? $("#opacityrow").fadeIn("fast") : $("#opacityrow").hide();
    $('#font').val() === '-Custom-' ? $("#customfontrow").show() : $("#customfontrow").hide();
}


async function revertColours() {
    // CHANGED: Made async to get data from storage.
    const settings = await chrome.storage.local.get(['s_bg', 's_text', 's_link', 's_table']);
    $('#s_bg').val(settings.s_bg);
    $('#s_text').val(settings.s_text);
    $('#s_link').val(settings.s_link);
    $('#s_table').val(settings.s_table);
    updateDemo();
}
function i18load() {
	$("#title").html("Decreased Productivity v"+version);
	$(".i18_default").html(chrome.i18n.getMessage("default"));
	$(".i18_enable").html(chrome.i18n.getMessage("enable"));
	$(".i18_enabled").html(chrome.i18n.getMessage("enabled"));
	$(".i18_disabled").html(chrome.i18n.getMessage("disabled"));
	$(".i18_globalmode").html(chrome.i18n.getMessage("globalmode"));
	$(".i18_globalmode2").html(chrome.i18n.getMessage("globalmode2"));
	$(".i18_globalmode3").html(chrome.i18n.getMessage("globalmode3"));
	$(".i18_cloak").html(chrome.i18n.getMessage("cloak"));
	$(".i18_uncloak").html(chrome.i18n.getMessage("uncloak"));
	$(".i18_level").html(chrome.i18n.getMessage("level"));
	$(".i18_paranoid").html(chrome.i18n.getMessage("paranoid"));
	$(".i18_sfw0").html(chrome.i18n.getMessage("sfw0"));
	$(".i18_sfw1").html(chrome.i18n.getMessage("sfw1"));
	$(".i18_sfw2").html(chrome.i18n.getMessage("sfw2"));
	$(".i18_nsfw").html(chrome.i18n.getMessage("nsfw"));
	$(".i18_toggle").html(chrome.i18n.getMessage("toggle"));
	$(".i18_toggle2").html(chrome.i18n.getMessage("toggle2"));
	$(".i18_toggle_hotkey").html(chrome.i18n.getMessage("hotkey"));
	$(".i18_toggle_paranoidhotkey").html(chrome.i18n.getMessage("paranoidhotkey"));
	$(".i18_hotkey_record").val(chrome.i18n.getMessage("hotkey_record"));
	$(".i18_opacity").html(chrome.i18n.getMessage("opacity"));
	$(".i18_collapseimage").html(chrome.i18n.getMessage("collapseimage"));
	$(".i18_opacity2").html(chrome.i18n.getMessage("opacity2"));
	$(".i18_unhovered").html(chrome.i18n.getMessage("unhovered"));
	$(".i18_hovered").html(chrome.i18n.getMessage("hovered"));
	$(".i18_stickiness").html(chrome.i18n.getMessage("stickiness"));
	$(".i18_stickiness2").html(chrome.i18n.getMessage("stickiness2"));
	$(".i18_favicons").html(chrome.i18n.getMessage("favicons"));
	$(".i18_hidetitles").html(chrome.i18n.getMessage("hidetitles"));
	$(".i18_showimages").html(chrome.i18n.getMessage("showimages"));
	$(".i18_showimages2").html(chrome.i18n.getMessage("showimages2"));
	$(".i18_showunderline").html(chrome.i18n.getMessage("showunderline"));
	$(".i18_removebold").html(chrome.i18n.getMessage("removebold"));
	$(".i18_showcontext").html(chrome.i18n.getMessage("showcontext"));
	$(".i18_showcontext2").html(chrome.i18n.getMessage("showcontext2"));
	$(".i18_showicon").html(chrome.i18n.getMessage("showicon"));
	$(".i18_showicon2").html(chrome.i18n.getMessage("showicon2"));
	$(".i18_showicon_type").html(chrome.i18n.getMessage("showicon_type"));
	$(".i18_showicon_type2").html(chrome.i18n.getMessage("showicon_type2"));
	$(".i18_showicon_title").html(chrome.i18n.getMessage("showicon_title"));
	$(".i18_showupdate").html(chrome.i18n.getMessage("showupdate"));
	$(".i18_showupdate2").html(chrome.i18n.getMessage("showupdate2"));
	$(".i18_font").html(chrome.i18n.getMessage("font"));
	$(".i18_customfont").html(chrome.i18n.getMessage("customfont"));
	$(".i18_fontsize").html(chrome.i18n.getMessage("fontsize"));
	$(".i18_color").html(chrome.i18n.getMessage("color"));
	$(".i18_colorpresets").html(chrome.i18n.getMessage("colorpresets"));
	$(".i18_colorpresetselect").html('-- '+chrome.i18n.getMessage("colorpresetselect")+' --');
	$(".i18_colorbackground").html(chrome.i18n.getMessage("colorbackground"));
	$(".i18_colortext").html(chrome.i18n.getMessage("colortext"));
	$(".i18_colorlink").html(chrome.i18n.getMessage("colorlink"));
	$(".i18_colortable").html(chrome.i18n.getMessage("colortable"));
	$(".i18_c1").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c2").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("gray"));
	$(".i18_c3").html(chrome.i18n.getMessage("gray")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c4").html(chrome.i18n.getMessage("lightred")+' - '+chrome.i18n.getMessage("paleblue"));
	$(".i18_c5").html(chrome.i18n.getMessage("darkbrown")+' - '+chrome.i18n.getMessage("offwhite"));
	$(".i18_c6").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c7").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("green"));
	$(".i18_c8").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("red"));
	$(".i18_c9").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("pink"));
	$(".i18_c10").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("green"));
	$(".i18_demo").html(chrome.i18n.getMessage("demo"));
	$(".i18_test1").html(chrome.i18n.getMessage("test1"));
	$(".i18_test2").html(chrome.i18n.getMessage("test2"));
	$(".i18_savecolours").val(chrome.i18n.getMessage("savecolours"));
	$(".i18_revertcolours").val(chrome.i18n.getMessage("revertcolours"));
	$(".i18_domain").html(chrome.i18n.getMessage("domain"));
	$(".i18_addwhitelist").val("+ "+chrome.i18n.getMessage("whitelist"));
	$(".i18_addblacklist").val("+ "+chrome.i18n.getMessage("blacklist"));
	$(".i18_whitelist").html(chrome.i18n.getMessage("whitelist"));
	$(".i18_blacklist").html(chrome.i18n.getMessage("blacklist"));
	$(".i18_clear").html(chrome.i18n.getMessage("clear"));
	$(".i18_save").val(chrome.i18n.getMessage("save"));
	$(".i18_close").val(chrome.i18n.getMessage("close"));
	$(".i18_people").html(chrome.i18n.getMessage("people"));
	$(".i18_translators").html(chrome.i18n.getMessage("translators"));
	$(".i18_help").html(chrome.i18n.getMessage("help"));
	$(".i18_support").html(chrome.i18n.getMessage("support"));
	$("#customcssdesc").html(chrome.i18n.getMessage("customcss"));
	$(".i18_supportimg").attr({alt: chrome.i18n.getMessage("support"), title:  chrome.i18n.getMessage("support")});
}

function opacitytest() {
	$("#o1").slider("option", "value", $("#opacity1").val());
	$("#o2").slider("option", "value", $("#opacity2").val());
	$(".sampleimage").css({"opacity": $("#opacity1").val()});
	$(".sampleimage").hover(
		function () {
			$(this).css("opacity", $("#opacity2").val());
		}, 
		function () {
			$(this).css("opacity", $("#opacity1").val());
		}
	);
}	

function notification(msg) {
	$('#message').html(msg).stop().fadeIn("slow").delay(2000).fadeOut("slow")
}

function updateDemo() {
	if ($('#disableFavicons').is(':checked')) $("#demo_favicon").attr('style','visibility: hidden');
	else $("#demo_favicon").removeAttr('style');
	if ($('#hidePageTitles').is(':checked')) $("#demo_title").text(truncText($("#pageTitleText").val()));	
	else $("#demo_title").text(chrome.i18n.getMessage("demo")+' Page');
	$("#demo_content").css('backgroundColor', $("#s_bg").val());
	$("#t_link").css('color', $("#s_link").val());
	$("#test table").css('border', "1px solid #" + $("#s_table").val());
	$("#t_table, #demo_content h1").css('color', $("#s_text").val());
	if ($("#font").val() == '-Custom-' && $("#customfont").val()) {
		$("#t_table, #demo_content h1").css({'font-family': $("#customfont").val(), 'font-size': $("#fontsize").val()});
	} else if ($("#font").val() != '-Unchanged-' && $("#font").val() != '-Custom-') {
		$("#t_table, #demo_content h1").css({'font-family': $("#font").val(), 'font-size': $("#fontsize").val()});
	} else {	
		$("#t_table, #demo_content h1").css({'font-family': 'Arial, sans-serif', 'font-size': '12px'});
	}
	if ($('#hidePageTitles').is(':checked')) $("#t_link").css('textDecoration', 'underline');
	if ($('#removeBold').is(':checked')) $("#demo_content h1").css('font-weight', 'normal');
	else  $("#demo_content h1").css('font-weight', 'bold');
	if ($('#showUnderline').is(':checked')) $("#t_link").css('textDecoration', 'underline');
	else $("#t_link").css('textDecoration', 'none');
	if ($("#sfwmode").val() == 'Paranoid') $(".sampleimage").attr('style','visibility: hidden');
	else if ($("#sfwmode").val() == 'NSFW') $(".sampleimage").attr('style','visibility: visible; opacity: 1 !important;').unbind();
	else opacitytest();
}

function stylePreset(s) {
	if (s) {
		var bg='FFFFFF';
		var text='000000';
		var link='000099';
		var table='cccccc';
		// Specific style colours
		switch (s)
		{
			case 'White - Gray':
				text='AAAAAA';
				link='AAAAAA';
				table='AAAAAA';
				break;
			case 'White - Green':
				link='008000';
				break;
			case 'Gray - Blue':
				bg='EEEEEE';
				break;
			case 'Light Red - Pale Blue':
				bg='FFEEE3';
				text='555';
				link='7F75AA';
				break;
			case 'Black - Blue':
				bg='000000';
				text='FFFFFF';
				link='36F';
				table='333333';
				break;
			case 'Dark Brown - Off-White':
				bg='2c2c2c';
				text='e5e9a8';
				link='5cb0cc';
				table='7f7f7f';
				break;
			case 'Black - Green':
				bg='000000';
				text='FFFFFF';
				link='00FF00';
				table='333333';
				break;
			case 'Black - Red':
				bg='000000';
				text='FFFFFF';
				link='FF0000';
				table='333333';
				break;
			case 'Black - Pink':
				bg='000000';
				text='FFFFFF';
				link='FF1CAE';
				table='333333';
				break;
		}
		$('#s_bg').val(bg);
		$('#s_text').val(text);
		$('#s_link').val(link);
		$('#s_table').val(table);
		updateDemo();
	}
}

function colorPickLoad(id) {
	$('#'+id).ColorPicker({
		onBeforeShow: function () {
			$(this).ColorPickerSetColor(this.value);
		},
		onChange: function (hsb, hex, rgb) {
			$('#'+id).val(hex);
			updateDemo();
		}
	});
}
