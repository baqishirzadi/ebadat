#!/usr/bin/env node
/**
 * Patches ios/abadt.xcodeproj/project.pbxproj to add:
 * - WidgetDataModule native bridge files
 * - EbadatPrayerWidget extension target
 */
const fs = require('fs');
const path = require('path');

const projectFile = path.join(__dirname, '../ios/abadt.xcodeproj/project.pbxproj');
let project = fs.readFileSync(projectFile, 'utf8');

if (project.includes('EbadatPrayerWidgetExtension')) {
  console.log('Widget extension already patched.');
  process.exit(0);
}

// WidgetDataModule in main app target
if (!project.includes('WidgetDataModule.swift in Sources')) {
  project = project.replace(
    '/* Begin PBXBuildFile section */',
    `/* Begin PBXBuildFile section */
\t\tW1D2G3T4A5M6O7D8U9L0E1F2 /* WidgetDataModule.swift in Sources */ = {isa = PBXBuildFile; fileRef = W1D2G3T4A5M6O7D8U9L0E1S1 /* WidgetDataModule.swift */; };
\t\tW1D2G3T4A5M6O7D8U9L0E1M3 /* WidgetDataModule.m in Sources */ = {isa = PBXBuildFile; fileRef = W1D2G3T4A5M6O7D8U9L0E1M1 /* WidgetDataModule.m */; };`
  );

  project = project.replace(
    'F11748412D0307B40044C1D9 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = AppDelegate.swift; path = abadt/AppDelegate.swift; sourceTree = "<group>"; };',
    `F11748412D0307B40044C1D9 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = AppDelegate.swift; path = abadt/AppDelegate.swift; sourceTree = "<group>"; };
\t\tW1D2G3T4A5M6O7D8U9L0E1S1 /* WidgetDataModule.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = WidgetDataModule.swift; path = abadt/WidgetDataModule.swift; sourceTree = "<group>"; };
\t\tW1D2G3T4A5M6O7D8U9L0E1M1 /* WidgetDataModule.m */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; name = WidgetDataModule.m; path = abadt/WidgetDataModule.m; sourceTree = "<group>"; };`
  );

  project = project.replace(
    '\t\t\t\tF11748412D0307B40044C1D9 /* AppDelegate.swift */,',
    `\t\t\t\tF11748412D0307B40044C1D9 /* AppDelegate.swift */,
\t\t\t\tW1D2G3T4A5M6O7D8U9L0E1S1 /* WidgetDataModule.swift */,
\t\t\t\tW1D2G3T4A5M6O7D8U9L0E1M1 /* WidgetDataModule.m */,`
  );

  project = project.replace(
    '\t\t\t\tF11748422D0307B40044C1D9 /* AppDelegate.swift in Sources */,',
    `\t\t\t\tF11748422D0307B40044C1D9 /* AppDelegate.swift in Sources */,
\t\t\t\tW1D2G3T4A5M6O7D8U9L0E1F2 /* WidgetDataModule.swift in Sources */,
\t\t\t\tW1D2G3T4A5M6O7D8U9L0E1M3 /* WidgetDataModule.m in Sources */,`
  );
}

// Widget extension build files
project = project.replace(
  '/* Begin PBXBuildFile section */',
  `/* Begin PBXBuildFile section */
\t\tW1D2G3E4XT001 /* EbadatPrayerWidget.swift in Sources */ = {isa = PBXBuildFile; fileRef = W1D2G3E4XFR001 /* EbadatPrayerWidget.swift */; };
\t\tW1D2G3E4XT002 /* PrayerTimesWidgetProvider.swift in Sources */ = {isa = PBXBuildFile; fileRef = W1D2G3E4XFR002 /* PrayerTimesWidgetProvider.swift */; };
\t\tW1D2G3E4XT003 /* PrayerTimesWidgetView.swift in Sources */ = {isa = PBXBuildFile; fileRef = W1D2G3E4XFR003 /* PrayerTimesWidgetView.swift */; };
\t\tW1D2G3E4XT004 /* WidgetShared.swift in Sources */ = {isa = PBXBuildFile; fileRef = W1D2G3E4XFR004 /* WidgetShared.swift */; };
\t\tW1D2G3E4XT005 /* Vazirmatn-Regular.ttf in Resources */ = {isa = PBXBuildFile; fileRef = C7AAF416978A422FB6AE300F /* Vazirmatn-Regular.ttf */; };
\t\tW1D2G3E4XT006 /* Vazirmatn-Bold.ttf in Resources */ = {isa = PBXBuildFile; fileRef = A49739E0C47249188274C1F8 /* Vazirmatn-Bold.ttf */; };
\t\tW1D2G3E4XT007 /* EbadatPrayerWidget.appex in Embed App Extensions */ = {isa = PBXBuildFile; fileRef = W1D2G3E4XPRD01 /* EbadatPrayerWidget.appex */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };`
);

project = project.replace(
  '/* End PBXFileReference section */',
  `\t\tW1D2G3E4XFR001 /* EbadatPrayerWidget.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = EbadatPrayerWidget.swift; sourceTree = "<group>"; };
\t\tW1D2G3E4XFR002 /* PrayerTimesWidgetProvider.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = PrayerTimesWidgetProvider.swift; sourceTree = "<group>"; };
\t\tW1D2G3E4XFR003 /* PrayerTimesWidgetView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = PrayerTimesWidgetView.swift; sourceTree = "<group>"; };
\t\tW1D2G3E4XFR004 /* WidgetShared.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetShared.swift; sourceTree = "<group>"; };
\t\tW1D2G3E4XFR005 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
\t\tW1D2G3E4XFR006 /* EbadatPrayerWidget.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = EbadatPrayerWidget.entitlements; sourceTree = "<group>"; };
\t\tW1D2G3E4XPRD01 /* EbadatPrayerWidget.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = EbadatPrayerWidget.appex; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */`
);

project = project.replace(
  '/* Begin PBXFrameworksBuildPhase section */',
  `/* Begin PBXCopyFilesBuildPhase section */
\t\tW1D2G3E4XEMB01 /* Embed App Extensions */ = {
\t\t\tisa = PBXCopyFilesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tdstPath = "";
\t\t\tdstSubfolderSpec = 13;
\t\t\tfiles = (
\t\t\t\tW1D2G3E4XT007 /* EbadatPrayerWidget.appex in Embed App Extensions */,
\t\t\t);
\t\t\tname = "Embed App Extensions";
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXCopyFilesBuildPhase section */

/* Begin PBXFrameworksBuildPhase section */
\t\tW1D2G3E4XFWK01 /* Frameworks */ = {
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};`
);

project = project.replace(
  '/* Begin PBXGroup section */',
  `/* Begin PBXGroup section */
\t\tW1D2G3E4XGRP01 /* EbadatPrayerWidget */ = {
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\tW1D2G3E4XFR001 /* EbadatPrayerWidget.swift */,
\t\t\t\tW1D2G3E4XFR002 /* PrayerTimesWidgetProvider.swift */,
\t\t\t\tW1D2G3E4XFR003 /* PrayerTimesWidgetView.swift */,
\t\t\t\tW1D2G3E4XFR004 /* WidgetShared.swift */,
\t\t\t\tW1D2G3E4XFR005 /* Info.plist */,
\t\t\t\tW1D2G3E4XFR006 /* EbadatPrayerWidget.entitlements */,
\t\t\t);
\t\t\tpath = EbadatPrayerWidget;
\t\t\tsourceTree = "<group>";
\t\t};`
);

project = project.replace(
  '\t\t\t\t13B07FAE1A68108700A75B9A /* abadt */,',
  `\t\t\t\t13B07FAE1A68108700A75B9A /* abadt */,
\t\t\t\tW1D2G3E4XGRP01 /* EbadatPrayerWidget */,`
);

project = project.replace(
  '\t\t\t\t13B07F961A680F5B00A75B9A /* abadt.app */,',
  `\t\t\t\t13B07F961A680F5B00A75B9A /* abadt.app */,
\t\t\t\tW1D2G3E4XPRD01 /* EbadatPrayerWidget.appex */,`
);

project = project.replace(
  `buildPhases = (
\t\t\t\t08A4A3CD28434E44B6B9DE2E /* [CP] Check Pods Manifest.lock */,
\t\t\t\t24E045330EE85A63543F62DC /* [Expo] Configure project */,
\t\t\t\t13B07F871A680F5B00A75B9A /* Sources */,
\t\t\t\t13B07F8C1A680F5B00A75B9A /* Frameworks */,
\t\t\t\t13B07F8E1A680F5B00A75B9A /* Resources */,
\t\t\t\t00DD1BFF1BD5951E006B06BC /* Bundle React Native code and images */,
\t\t\t\t800E24972A6A228C8D4807E9 /* [CP] Copy Pods Resources */,
\t\t\t\t058D24F583EFC518102AF760 /* [CP] Embed Pods Frameworks */,
\t\t\t);`,
  `buildPhases = (
\t\t\t\t08A4A3CD28434E44B6B9DE2E /* [CP] Check Pods Manifest.lock */,
\t\t\t\t24E045330EE85A63543F62DC /* [Expo] Configure project */,
\t\t\t\t13B07F871A680F5B00A75B9A /* Sources */,
\t\t\t\t13B07F8C1A680F5B00A75B9A /* Frameworks */,
\t\t\t\t13B07F8E1A680F5B00A75B9A /* Resources */,
\t\t\t\t00DD1BFF1BD5951E006B06BC /* Bundle React Native code and images */,
\t\t\t\t800E24972A6A228C8D4807E9 /* [CP] Copy Pods Resources */,
\t\t\t\t058D24F583EFC518102AF760 /* [CP] Embed Pods Frameworks */,
\t\t\t\tW1D2G3E4XEMB01 /* Embed App Extensions */,
\t\t\t);`
);

project = project.replace(
  `\t\t\tdependencies = (
\t\t\t);
\t\t\tname = abadt;`,
  `\t\t\tdependencies = (
\t\t\t\tW1D2G3E4XDEP01 /* PBXTargetDependency */,
\t\t\t);
\t\t\tname = abadt;`
);

project = project.replace(
  '/* End PBXNativeTarget section */',
  `\t\tW1D2G3E4XTGT01 /* EbadatPrayerWidgetExtension */ = {
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = W1D2G3E4XCFGL01 /* Build configuration list for PBXNativeTarget "EbadatPrayerWidgetExtension" */;
\t\t\tbuildPhases = (
\t\t\t\tW1D2G3E4XSRC01 /* Sources */,
\t\t\t\tW1D2G3E4XFWK01 /* Frameworks */,
\t\t\t\tW1D2G3E4XRES01 /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = EbadatPrayerWidgetExtension;
\t\t\tproductName = EbadatPrayerWidgetExtension;
\t\t\tproductReference = W1D2G3E4XPRD01 /* EbadatPrayerWidget.appex */;
\t\t\tproductType = "com.apple.product-type.app-extension";
\t\t};
/* End PBXNativeTarget section */`
);

project = project.replace(
  'targets = (\n\t\t\t\t13B07F861A680F5B00A75B9A /* abadt */,\n\t\t\t);',
  'targets = (\n\t\t\t\t13B07F861A680F5B00A75B9A /* abadt */,\n\t\t\t\tW1D2G3E4XTGT01 /* EbadatPrayerWidgetExtension */,\n\t\t\t);'
);

project = project.replace(
  `TargetAttributes = {
\t\t\t\t\t13B07F861A680F5B00A75B9A = {
\t\t\t\t\t\tLastSwiftMigration = 1250;
\t\t\t\t\t};
\t\t\t\t};`,
  `TargetAttributes = {
\t\t\t\t\t13B07F861A680F5B00A75B9A = {
\t\t\t\t\t\tLastSwiftMigration = 1250;
\t\t\t\t\t};
\t\t\t\t\tW1D2G3E4XTGT01 = {
\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;
\t\t\t\t\t};
\t\t\t\t};`
);

project = project.replace(
  '/* End PBXResourcesBuildPhase section */',
  `\t\tW1D2G3E4XRES01 /* Resources */ = {
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\tW1D2G3E4XT005 /* Vazirmatn-Regular.ttf in Resources */,
\t\t\t\tW1D2G3E4XT006 /* Vazirmatn-Bold.ttf in Resources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXResourcesBuildPhase section */`
);

project = project.replace(
  '/* End PBXSourcesBuildPhase section */',
  `\t\tW1D2G3E4XSRC01 /* Sources */ = {
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\tW1D2G3E4XT001 /* EbadatPrayerWidget.swift in Sources */,
\t\t\t\tW1D2G3E4XT002 /* PrayerTimesWidgetProvider.swift in Sources */,
\t\t\t\tW1D2G3E4XT003 /* PrayerTimesWidgetView.swift in Sources */,
\t\t\t\tW1D2G3E4XT004 /* WidgetShared.swift in Sources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXSourcesBuildPhase section */`
);

project = project.replace(
  '/* End XCBuildConfiguration section */',
  `\t\tW1D2G3E4XDBG01 /* Debug */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tCODE_SIGN_ENTITLEMENTS = EbadatPrayerWidget/EbadatPrayerWidget.entitlements;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_TEAM = 3F4D8X5MG9;
\t\t\t\tINFOPLIST_FILE = EbadatPrayerWidget/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.1;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t\t"@executable_path/../../Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.afghandev.ebadat.EbadatPrayerWidget;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSKIP_INSTALL = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t};
\t\t\tname = Debug;
\t\t};
\t\tW1D2G3E4XREL01 /* Release */ = {
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {
\t\t\t\tCODE_SIGN_ENTITLEMENTS = EbadatPrayerWidget/EbadatPrayerWidget.entitlements;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_TEAM = 3F4D8X5MG9;
\t\t\t\tINFOPLIST_FILE = EbadatPrayerWidget/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.1;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t\t"@executable_path/../../Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.afghandev.ebadat.EbadatPrayerWidget;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSKIP_INSTALL = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t};
\t\t\tname = Release;
\t\t};
/* End XCBuildConfiguration section */`
);

project = project.replace(
  '/* End XCConfigurationList section */',
  `\t\tW1D2G3E4XCFGL01 /* Build configuration list for PBXNativeTarget "EbadatPrayerWidgetExtension" */ = {
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\tW1D2G3E4XDBG01 /* Debug */,
\t\t\t\tW1D2G3E4XREL01 /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t};
\t\tW1D2G3E4XDEP01 /* PBXTargetDependency */ = {
\t\t\tisa = PBXTargetDependency;
\t\t\ttarget = W1D2G3E4XTGT01 /* EbadatPrayerWidgetExtension */;
\t\t\ttargetProxy = W1D2G3E4XPRX01 /* PBXContainerItemProxy */;
\t\t};
\t\tW1D2G3E4XPRX01 /* PBXContainerItemProxy */ = {
\t\t\tisa = PBXContainerItemProxy;
\t\t\tcontainerPortal = 83CBB9F71A601CBA00E9B192 /* Project object */;
\t\t\tproxyType = 1;
\t\t\tremoteGlobalIDString = W1D2G3E4XTGT01;
\t\t\tremoteInfo = EbadatPrayerWidgetExtension;
\t\t};
/* End XCConfigurationList section */`
);

// Add WidgetDataModule files to abadt group
if (!project.includes('W1D2G3T4A5M6O7D8U9L0E1S1')) {
  project = project.replace(
    '\t\t\t\tF11748412D0307B40044C1D9 /* AppDelegate.swift */,',
    `\t\t\t\tF11748412D0307B40044C1D9 /* AppDelegate.swift */,
\t\t\t\tW1D2G3T4A5M6O7D8U9L0E1S1 /* WidgetDataModule.swift */,
\t\t\t\tW1D2G3T4A5M6O7D8U9L0E1M1 /* WidgetDataModule.m */,`
  );
}

fs.writeFileSync(projectFile, project);
console.log('Patched iOS project for widget extension.');
