#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraSpotlight, NSObject)

RCT_EXTERN_METHOD(indexPost:(NSString *)postId
                  title:(NSString *)title
                  subreddit:(NSString *)subreddit
                  author:(NSString *)author
                  thumbnailURL:(NSString *)thumbnailURL
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(indexSubreddit:(NSString *)subredditName
                  displayName:(NSString *)displayName
                  description:(NSString *)description
                  iconURL:(NSString *)iconURL
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeAllItems:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removePostItems:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
