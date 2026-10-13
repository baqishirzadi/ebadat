#import <React/RCTViewManager.h>

@interface RCT_EXTERN_REMAP_MODULE(Hifz16PageView, Hifz16PageManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(pageJson, NSString)
RCT_EXPORT_VIEW_PROPERTY(fontFamily, NSString)
RCT_EXPORT_VIEW_PROPERTY(paperColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(inkColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(accentColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(contentTop, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(contentBottom, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(activeSurah, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(activeAyah, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onHifzLinePress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHifzPagePress, RCTDirectEventBlock)
@end
