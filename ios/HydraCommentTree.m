#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HydraCommentTree, NSObject)

RCT_EXTERN_METHOD(formatComments:(NSArray *)comments
                  collapseAutoModerator:(BOOL)collapseAutoModerator
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
