#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraSeenPosts, NSObject)

RCT_EXTERN_METHOD(arePostsSeen:(NSArray<NSString *> *)postIds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isPostSeen:(NSString *)postId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
