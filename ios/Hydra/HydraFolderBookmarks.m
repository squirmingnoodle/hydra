#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraFolderBookmarks, NSObject)

RCT_EXTERN_METHOD(storeBookmark:(NSString *)scope
                  directoryUri:(NSString *)directoryUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearBookmark:(NSString *)scope
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasBookmark:(NSString *)scope
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(copyFileToBookmarkedRoot:(NSString *)scope
                  sourceFileUri:(NSString *)sourceFileUri
                  subredditFolder:(NSString *)subredditFolder
                  originalFileName:(NSString *)originalFileName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
